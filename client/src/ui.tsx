// Barrel for the local component library (atoms / molecules / organisms), styled after Tayseer.
import type { ReactNode } from 'react'
import { UAEBadge, type BadgeVariant } from './components/atoms/UAEBadge'
import { useT } from './i18n'
export { UAEButton } from './components/atoms/UAEButton'
export { Field, Err, inputCls } from './components/atoms/UAEInput'
export { Card, Grid, Row, Lead, List } from './components/molecules/UAECard'
export { UAEDataTable } from './components/organisms/UAEDataTable'
const V: Record<string, BadgeVariant> = { active:'success', approved:'success', revoked:'error', rejected:'error', expired:'default', superseded:'default', requested:'warn', pending:'warn', observation:'accent' }
export function Badge({ s, children }: { s: string; children?: ReactNode }) {
  const t = useT(); return <UAEBadge variant={V[s] ?? 'default'}>{children ?? t(s)}</UAEBadge>
}
// One status vocabulary across the product: Verified, Pending, Expired, Revoked, Replaced (+ Active, Draft, Submitted …)
export type StatusCode = 'required'|'uploaded'|'awaiting'|'rejected'|'na'|'notacc'|'verified'|'unverified'|'pending'|'expired'|'revoked'|'replaced'|'active'|'draft'|'submitted'|'review'|'info'|'accepted'|'declined'|'off'
const S: Record<StatusCode, [string, string, BadgeVariant]> = {
  verified: ['✓', 'Verified', 'success'], unverified: ['!', 'Not verified', 'warn'], pending: ['⏳', 'Pending', 'warn'], expired: ['⌛', 'Expired', 'default'],
  revoked: ['✕', 'Revoked', 'error'], replaced: ['↻', 'Replaced', 'default'], active: ['●', 'Active', 'success'], draft: ['✎', 'Draft', 'default'],
  submitted: ['➤', 'Submitted', 'accent'], required: ['!', 'Required', 'warn'], uploaded: ['↑', 'Uploaded', 'default'], awaiting: ['⏳', 'Awaiting verification', 'warn'], rejected: ['✕', 'Rejected', 'error'], na: ['–', 'Not applicable', 'default'], notacc: ['✕', 'Not accepted', 'error'], review: ['⏳', 'Under review', 'warn'], info: ['?', 'More information requested', 'warn'], accepted: ['✓', 'Accepted', 'success'], declined: ['✕', 'Declined', 'error'], off: ['○', 'Off', 'default'] }
const DOT: Record<BadgeVariant, string> = { success: 'bg-ok text-ok', error: 'bg-bad text-bad', warn: 'bg-warn text-warn', accent: 'bg-primary text-primary', primary: 'bg-primary text-primary', default: 'bg-muted text-muted', secondary: 'bg-muted text-muted' }
export function Status({ code }: { code: StatusCode }) { const t = useT(), [, l, v] = S[code], c = DOT[v].split(' ')
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${c[1]}`}><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${c[0]}`} />{t(l)}</span> }
// map server states to the shared vocabulary
export const recStatus = (r: { status: string; verification?: { code: string } }): StatusCode =>
  r.status === 'revoked' ? 'revoked' : r.status === 'superseded' ? 'replaced' : !r.verification || r.verification.code === 'verified' ? 'verified' : 'unverified'
export const applyStatus = (a: { submitted: boolean; status?: string; name?: string; problem?: string }): StatusCode =>
  !a.submitted ? (a.status === 'more information requested' ? 'info' : 'draft') : a.status === 'under review' ? 'review' : a.status === 'more information requested' ? 'info' : a.status === 'accepted' ? 'accepted' : a.status === 'declined' ? 'declined' : 'submitted'
export const linkStatus = (s: string): StatusCode => s === 'approved' || s === 'active' ? 'active' : s === 'pending' ? 'pending' : s === 'expired' ? 'expired' : s === 'revoked' || s === 'rejected' ? 'revoked' : 'off'
export function Guard({ ok, msg }: { ok: boolean; msg: string }) {
  const t = useT(); return ok ? null : <div className="rounded-2xl border border-line bg-card p-4 mb-4"><b>{t('Not available for this role.')}</b> {t(msg)}</div>
}
export const PageHead = ({ title, lead, eyebrow, children }: { title: string; lead?: string; eyebrow?: string; children?: ReactNode }) =>
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5"><div className="min-w-0">{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h1 className="display text-3xl sm:text-[2.6rem]">{title}</h1>{lead && <p className="hint mt-2 max-w-prose text-muted">{lead}</p>}</div>{children}</div>
export const Disclosure = ({ title, children, open, className = '' }: { title: ReactNode; children: ReactNode; open?: boolean; className?: string }) =>
  <details open={open} className={`rounded-2xl border border-line bg-card ${className}`}><summary className="flex min-h-11 items-center gap-2 px-4 py-3 font-medium"><span aria-hidden className="chev inline-block text-primary">▸</span><span className="min-w-0 flex-1">{title}</span></summary><div className="px-4 pb-4">{children}</div></details>
export const Note = ({ children, tone = 'soft' }: { children: ReactNode; tone?: 'soft' | 'warn' }) =>
  <p className={`rounded-xl px-3 py-2 text-sm ${tone === 'warn' ? 'border border-warn text-warn' : 'bg-soft'}`}>{children}</p>
export const Simulated = ({ children }: { children: ReactNode }) => <UAEBadge variant="default"><span aria-hidden>⚙</span> {children}</UAEBadge>
export const fmtDate = (d: string | null | undefined, lang: string) => !d ? '—' : new Date(d.length === 10 ? d + 'T00:00:00Z' : d).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
