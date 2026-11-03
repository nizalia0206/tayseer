import { useEffect, useRef, useState } from 'react'
import { useT } from './i18n'
// Accessibility preferences are interface settings stored on this device only. They are never part of the learner card or records.
const KEY = 'uaeds-accessibility-settings'
export type Accent = 'gold'|'blue'|'red'|'green'
export type Cursor = 'normal'|'large'|'xl'
export interface A11y { fs: number; hc: boolean; dy: boolean; rm: boolean; dk: boolean; simple: boolean; accent: Accent; hl: boolean; cursor: Cursor; sat: number; sign: boolean }
const DEF: A11y = { fs: 100, hc: false, dy: false, rm: false, dk: false, simple: false, accent: 'gold', hl: false, cursor: 'normal', sat: 100, sign: false }
const ACCENTS: Accent[] = ['gold', 'blue', 'red', 'green']
const load = (): A11y => {
  try { const s = localStorage.getItem(KEY); if (s) { const v = { ...DEF, ...JSON.parse(s) }; if (!ACCENTS.includes(v.accent)) v.accent = 'gold'; return v } } catch { /* ignore */ }
  const m = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches
  return { ...DEF, rm: m('(prefers-reduced-motion:reduce)'), dk: m('(prefers-color-scheme:dark)') }
}
const arrow = (px: number, fill: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${px}' height='${px}' viewBox='0 0 24 24'><path d='M3 2l7 19 3-8 8-3z' fill='${fill}' stroke='white' stroke-width='1.5'/></svg>`)}") 0 0, auto`
export function applyA11y(a: A11y, r: HTMLElement = document.documentElement) {
  r.style.setProperty('--fs', String(a.fs / 100)); r.style.setProperty('--ls', a.dy ? '.06em' : '0em')
  r.dataset.hc = a.hc ? 'on' : ''; r.dataset.rm = a.rm ? 'on' : ''; r.dataset.theme = a.dk ? 'dark' : 'light'
  r.dataset.accent = a.accent; r.dataset.hl = a.hl ? 'on' : ''; r.dataset.cursor = a.cursor; r.dataset.simple = a.simple ? 'on' : ''
  r.style.filter = a.sat === 100 ? '' : `saturate(${a.sat}%)`
  const px = a.cursor === 'xl' ? 64 : 40
  r.style.setProperty('--cur', a.cursor === 'normal' ? 'auto' : arrow(px, 'black')); r.style.setProperty('--cur-p', a.cursor === 'normal' ? 'pointer' : arrow(px, '#92722A'))
}
export function useA11y() {
  const [a, set] = useState<A11y>(load)
  useEffect(() => {
    applyA11y(a)
    try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* storage blocked */ }
    window.dispatchEvent(new CustomEvent('ui:accessibilityChanged', { detail: a }))
  }, [a])
  return [a, (p: Partial<A11y>) => set(x => ({ ...x, ...p })), () => set({ ...DEF })] as const
}
const SW: Record<Accent, string> = { gold: '#92722A', blue: '#0B6FA4', red: '#B42323', green: '#2B7A3D' }
type SwKey = 'dk'|'hc'|'hl'|'dy'|'rm'|'simple'|'sign'
// Tayseer's dark side drawer, carrying Tayseer's full set of settings.
export function A11yPanel({ a, up, reset, close }: { a: A11y; up: (p: Partial<A11y>) => void; reset: () => void; close: () => void }) {
  const t = useT(), ref = useRef<HTMLButtonElement>(null)
  useEffect(() => { ref.current?.focus(); const k = (e: KeyboardEvent) => e.key === 'Escape' && close(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, []) // eslint-disable-line
  const sel = 'bg-[var(--card-accent)] border-[var(--card-accent)] text-white', un = 'border-white/25 text-gray-100'
  const Sw = ({ k, label }: { k: SwKey; label: string }) =>
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-3"><span>{t(label)}</span>
      <button role="switch" aria-checked={a[k]} aria-label={t(label)} onClick={() => up({ [k]: !a[k] })} className={`relative h-7 w-12 shrink-0 rounded-full transition cursor-pointer ${a[k] ? 'bg-[var(--card-accent)]' : 'bg-gray-400'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${a[k] ? 'start-6' : 'start-1'}`} /></button></div>
  const Block = ({ title, children }: { title: string; children: React.ReactNode }) =>
    <div className="border-b border-white/10 py-3"><div className="mb-2">{t(title)}</div>{children}</div>
  return <div id="panel" role="dialog" aria-label={t('Accessibility menu')} className="fixed inset-y-0 end-0 z-50 w-[min(92vw,360px)] overflow-y-auto bg-[#111827] p-6 text-white shadow-2xl">
    <div className="flex items-center justify-between"><h2 className="text-2xl font-extrabold text-white">{t('Accessibility')}</h2>
      <button ref={ref} onClick={close} aria-label={t('Close accessibility settings')} className="min-h-11 min-w-11 rounded-lg text-2xl cursor-pointer">✕</button></div>
    <Sw k="dk" label="Dark mode" />
    <Block title="Colors"><div className="flex gap-3" role="radiogroup" aria-label={t('Colors')}>{ACCENTS.map(c =>
      <button key={c} role="radio" aria-checked={a.accent === c} aria-label={t(c)} onClick={() => up({ accent: c })} style={{ background: SW[c] }}
        className={`h-11 w-11 rounded-full text-lg text-white cursor-pointer ${a.accent === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111827]' : ''}`}>{a.accent === c ? '✓' : ''}</button>)}</div></Block>
    <Sw k="hc" label="Contrast" />
    <Sw k="hl" label="Highlight" />
    <Block title="Font size"><div className="flex items-center gap-3">
      <button aria-label={t('Smaller text')} className={`h-12 w-14 rounded-lg border-2 cursor-pointer ${un}`} onClick={() => up({ fs: Math.max(80, a.fs - 10) })}>A−</button>
      <span aria-live="polite" className="min-w-12 text-center">{a.fs}%</span>
      <button aria-label={t('Larger text')} className={`h-12 w-14 rounded-lg border-2 cursor-pointer text-lg ${un}`} onClick={() => up({ fs: Math.min(140, a.fs + 10) })}>A+</button></div></Block>
    <Block title="Cursor size"><div className="flex gap-3" role="group" aria-label={t('Cursor size')}>{([['normal', 'Normal', 16], ['large', 'Large', 24], ['xl', 'Extra large', 34]] as [Cursor, string, number][]).map(([v, l, s]) =>
      <button key={v} aria-pressed={a.cursor === v} aria-label={t(l)} onClick={() => up({ cursor: v })} className={`grid h-12 w-14 place-items-center rounded-lg border-2 cursor-pointer ${a.cursor === v ? sel : un}`}>
        <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden><path d="M3 2l7 19 3-8 8-3z" fill="currentColor" /></svg></button>)}</div></Block>
    <Block title="Saturation"><div className="flex items-center gap-3"><input className="w-full accent-[var(--card-accent)]" type="range" min={0} max={200} step={10} value={a.sat} aria-label={t('Saturation')} onChange={e => up({ sat: +e.target.value })} /><span className="min-w-12">{a.sat}%</span></div></Block>
    <Sw k="sign" label="Sign language" />
    <Sw k="dy" label="Easier-reading letter spacing" />
    <Sw k="rm" label="Reduce motion" />
    <Sw k="simple" label="Simple mode" />
    <button onClick={reset} className="mt-4 w-full min-h-11 rounded-lg border border-white/30 py-3 cursor-pointer">{t('Reset all')}</button>
    <p className="mt-3 text-sm text-gray-300">{t('Interface preferences only. They never appear on the card and reveal no diagnosis.')}</p>
  </div>
}
