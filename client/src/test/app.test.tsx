import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import App from '../App'
import { applyA11y } from '../a11y'
import { AR, tr } from '../i18n'

const SRC = join(__dirname, '..')
const files = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'test' ? [] : files(join(d, e.name))) : /\.tsx?$/.test(e.name) ? [join(d, e.name)] : [])

describe('Arabic translation', () => {
  it('has an Arabic string for every t("…") used in the UI', () => {
    const missing: string[] = []
    for (const f of files(SRC)) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\((['"])((?:(?!\1).)*)\1\)/g)) if (!AR[m[2]]) missing.push(m[2])
    expect(missing).toEqual([])
  })
  it('covers every error message the server can return', () => {
    const srv = readFileSync(join(SRC, '..', '..', 'server.js'), 'utf8'), missing: string[] = []
    for (const m of srv.matchAll(/error:'((?:[^'\\]|\\.)*)'/g)) { const k = m[1].replace(/\\'/g, "'"); if (!AR[k]) missing.push(k) }
    expect(missing).toEqual([])
  })
  it('falls back to English for unknown strings and never returns empty Arabic', () => {
    expect(tr('ar', 'zzz unknown')).toBe('zzz unknown')
    expect(Object.values(AR).every(v => v.trim().length > 0)).toBe(true)
  })
})

describe('accessibility settings', () => {
  it('applies theme, contrast, highlight, accent, cursor, font size and saturation', () => {
    const r = document.createElement('div')
    applyA11y({ fs: 120, hc: true, dy: true, rm: true, dk: true, simple: false, accent: 'blue', hl: true, cursor: 'xl', sat: 40, sign: false }, r)
    expect(r.dataset.theme).toBe('dark'); expect(r.dataset.hc).toBe('on'); expect(r.dataset.hl).toBe('on'); expect(r.dataset.accent).toBe('blue'); expect(r.dataset.cursor).toBe('xl')
    expect(r.style.getPropertyValue('--fs')).toBe('1.2'); expect(r.style.filter).toBe('saturate(40%)'); expect(r.style.getPropertyValue('--cur')).toContain('data:image/svg+xml')
  })
  it('leaves saturation untouched at 100%', () => {
    const r = document.createElement('div'); applyA11y({ fs: 100, hc: false, dy: false, rm: false, dk: false, simple: false, accent: 'gold', hl: false, cursor: 'normal', sat: 100, sign: false }, r)
    expect(r.style.filter).toBe(''); expect(r.style.getPropertyValue('--cur')).toBe('auto')
  })
})

describe('app shell', () => {
  beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ user: null }) }))) })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('shows sign-in, switches to Arabic with right-to-left layout and brand', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(screen.getAllByText('Tayseer').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }))
    expect(document.documentElement.dir).toBe('rtl'); expect(document.documentElement.lang).toBe('ar')
    await screen.findByRole('heading', { name: 'تسجيل الدخول' }); expect(document.title).toBe('تيسير')
  })

  it('accessibility menu toggles dark mode, contrast and highlight', async () => {
    render(<App />); await screen.findByRole('heading', { name: 'Sign in' })
    fireEvent.click(screen.getByRole('button', { name: 'Accessibility' }))
    for (const [name, attr, val] of [['Dark mode', 'theme', 'dark'], ['Contrast', 'hc', 'on'], ['Highlight', 'hl', 'on']] as const) {
      fireEvent.click(screen.getByRole('switch', { name })); await waitFor(() => expect(document.documentElement.dataset[attr]).toBe(val))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Larger text' })); await waitFor(() => expect(document.documentElement.style.getPropertyValue('--fs')).toBe('1.1'))
    fireEvent.click(screen.getByRole('button', { name: 'Reset all' })); await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
  })

  it('sign language panel opens and shows a clear placeholder when the clip is missing', async () => {
    const { container } = render(<App />); await screen.findByRole('heading', { name: 'Sign in' })
    fireEvent.click(screen.getByRole('button', { name: 'Accessibility' })); fireEvent.click(screen.getByRole('switch', { name: 'Sign language' }))
    const panel = await screen.findByRole('complementary', { name: 'Sign language' }); expect(panel).toBeTruthy()
    fireEvent.error(container.querySelector('video')!)
    await screen.findByText('The sign language clip for this screen is not recorded yet.')
    fireEvent.click(screen.getByRole('button', { name: 'Close' })); await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Sign language' })).toBeNull())
  })
})
