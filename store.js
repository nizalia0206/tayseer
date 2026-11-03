'use strict';
// Optional shared storage for the demo data, so every server instance sees the same state (needed on Vercel,
// where each request can run on a fresh instance). Uses the Upstash Redis REST API with built-in fetch.
// Turned on when KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) are set.
// Without them nothing changes: data stays in memory, as with `npm start`.
const URL_ = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const KEY = process.env.TAYSEER_STATE_KEY || 'tayseer:demo-state';
const on = !!(URL_ && TOKEN);
const call = async cmd => {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('store HTTP ' + r.status);
  return (await r.json()).result
};
// Maps (share grants) are kept as tagged entry lists
const dump = db => JSON.stringify(db, (k, v) => v instanceof Map ? { __map: [...v] } : v);
const parse = s => JSON.parse(s, (k, v) => v && typeof v === 'object' && Array.isArray(v.__map) ? new Map(v.__map) : v);
const load = async () => { const r = await call(['GET', KEY]); return typeof r === 'string' ? r : null };
const save = s => call(['SET', KEY, s]);
module.exports = { on, dump, parse, load, save };
