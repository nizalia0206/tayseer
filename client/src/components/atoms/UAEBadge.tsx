import type { ReactNode } from 'react'
// Tayseer badge: small rounded pill. ok = verified, error = revoked, warn = pending, primary = filled accent.
export type BadgeVariant = 'default'|'primary'|'secondary'|'accent'|'error'|'success'|'warn'
const cls: Record<BadgeVariant,string> = { default:'border-line bg-soft text-muted', primary:'bg-primary text-primary-fg border-primary', secondary:'border-line text-fg', accent:'border-primary text-primary', error:'border-bad text-bad', success:'border-ok text-ok bg-soft', warn:'border-warn text-warn' }
export const UAEBadge = ({ variant='default', children }: { variant?: BadgeVariant; children: ReactNode }) =>
  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls[variant]}`}>{children}</span>
