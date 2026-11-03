'use strict';
// Demo state that travels with the browser (used on Vercel when no shared store is configured).
// Vercel runs short-lived server instances, so in-memory data would differ between clicks. Instead the demo
// state is packed into signed, HttpOnly cookies: each browser keeps its own demo, exactly as one `npm start`
// server would, whichever instance answers. The HMAC signature means the browser cannot alter the state;
// all permission checks still run on the server.
const zlib = require('zlib'), crypto = require('crypto')
const CHUNK = 3800, MAX = 8, NAME = 'tys'
// History is fixed demo data except transfer item statuses, so only those statuses are kept
function compact(db) {
  const { history, ...rest } = db, st = []
  for (const tr of history.transfers) for (const g of tr.groups || []) for (const it of g.items || []) st.push([tr.id, it.id, it.status])
  return JSON.stringify({ ...rest, audit: (db.audit || []).slice(-60), hx: st }, (k, v) => v instanceof Map ? { __map: [...v] } : v)
}
function expand(json, freshHistory) {
  const o = JSON.parse(json, (k, v) => v && typeof v === 'object' && Array.isArray(v.__map) ? new Map(v.__map) : v), history = freshHistory()
  const at = new Map((o.hx || []).map(([t, i, s]) => [t + '/' + i, s]))
  for (const tr of history.transfers) for (const g of tr.groups || []) for (const it of g.items || []) { const s = at.get(tr.id + '/' + it.id); if (s) it.status = s }
  delete o.hx; o.history = history; return o
}
const sign = (secret, x) => crypto.createHmac('sha256', secret).update(x).digest('base64url')
// cookie header -> state object (or null when missing, damaged or not signed by this server)
function read(cookies, secret, freshHistory) {
  const n = Math.min(+cookies[NAME + 'n'] || 0, MAX); if (!n) return null
  let s = ''; for (let i = 0; i < n; i++) { const c = cookies[NAME + i]; if (!c) return null; s += c }
  const dot = s.lastIndexOf('.'); if (dot < 1) return null
  const body = s.slice(0, dot), sig = s.slice(dot + 1), ok = sign(secret, body)
  if (sig.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok))) return null
  try { return expand(zlib.brotliDecompressSync(Buffer.from(body, 'base64url')).toString(), freshHistory) } catch { return null }
}
// state object -> Set-Cookie values (clears chunks left over from a larger earlier state)
function write(json, secret, oldN, secure) {
  const body = zlib.brotliCompressSync(Buffer.from(json)).toString('base64url'), s = body + '.' + sign(secret, body)
  const parts = []; for (let i = 0; i < s.length; i += CHUNK) parts.push(s.slice(i, i + CHUNK))
  if (parts.length > MAX) return null
  const attr = '; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000' + (secure ? '; Secure' : '')
  const out = parts.map((p, i) => `${NAME}${i}=${p}${attr}`); out.push(`${NAME}n=${parts.length}${attr}`)
  for (let i = parts.length; i < Math.min(oldN, MAX); i++) out.push(`${NAME}${i}=; Path=/; Max-Age=0`)
  return out
}
module.exports = { compact, read, write, NAME }
