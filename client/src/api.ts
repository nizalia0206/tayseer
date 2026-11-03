export interface ApiResult { ok: boolean; status: number; [k: string]: any }
export async function api(path: string, body?: unknown): Promise<ApiResult> {
  const r = await fetch('/api' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  let j: any = {}; try { j = await r.json() } catch { /* no body */ }
  return { ok: r.ok, status: r.status, ...j }
}
export const tokenOf = (x: string) => (x.match(/#\/g\/(\w{32})/) || [])[1]
