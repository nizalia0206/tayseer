import type { ButtonHTMLAttributes } from 'react'
// Tayseer button: 44px touch target, rounded-lg, gold border; primary is filled.
export type ButtonVariant = 'primary'|'secondary'|'tertiary'|'destructive'
const cls: Record<ButtonVariant,string> = {
  primary: 'bg-primary text-primary-fg border-primary hover:brightness-95',
  secondary: 'bg-card text-fg border-line hover:border-fg',
  tertiary: 'bg-transparent text-primary border-transparent underline underline-offset-2 hover:bg-soft',
  destructive: 'bg-transparent text-bad border-bad hover:bg-soft' }
export function UAEButton({ variant='primary', loading=false, className='', disabled, children, type='button', ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return <button type={type} {...p} disabled={disabled || loading} aria-busy={loading || undefined}
    className={`inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] border px-4 py-2 text-[0.95rem] font-medium cursor-pointer transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${cls[variant]} ${className}`}>{loading ? '…' : children}</button>
}
