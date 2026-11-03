import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TimelineView } from '../timeline'
import { LangCtx, type Lang } from '../i18n'
import type { TEntry } from '../types'

const E = (o: Partial<TEntry> & { id: string; title: string; date: string }): TEntry => ({ type: 'award', category: 'extracurricular', issuedAt: o.date, issuer: 'Al Noor School', src: 'S-' + o.id, level: null, status: 'active',
  verification: { code: 'verified', label: 'Issued by an approved issuer' }, current: true, replaces: null, replacedBy: null, history: [], context: null, related: [], ...o })
const ENR = E({ id: 'ENR-1', title: 'Enrollment, Grade 8', date: '2026-07-05', type: 'enrollment', category: 'academic', related: [{ id: 'AWD-2', title: 'Sustainability Challenge, Finalist' }] })
const AWD = E({ id: 'AWD-2', title: 'Sustainability Challenge, Finalist', date: '2026-10-20', issuer: 'Sustainability Competition B', context: { id: 'ENR-1', title: 'Enrollment, Grade 8', issuer: 'Al Noor School' } })
const OLD = E({ id: 'IMP-3', title: 'Science fair', date: '2025-03-02', type: 'academic', category: 'academic', level: 'Gold', status: 'revoked', verification: { code: 'revoked', label: 'Revoked by the issuer' } })

const mount = (entries: TEntry[], lang: Lang = 'en', role = 'sara', ok = true) => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status: ok ? 200 : 403, json: async () => (ok ? { entries, note: 'Verified means the issuer is approved on Tayseer and issued this record. It does not prove every detail is true.' } : { error: 'This role cannot browse a learner profile' }) })))
  const go = vi.fn()
  render(<LangCtx.Provider value={lang}><TimelineView user={{ id: role, name: 'Sara', role: role as any, org: 'x' }} data={{ records: [] } as any} reload={async () => {}} go={go} pending={null} clearPending={() => {}} /></LangCtx.Provider>)
  return go
}
const titles = () => screen.getAllByRole('button', { expanded: false }).map(b => b.textContent ?? '')
beforeEach(() => localStorage.clear()); afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('learner timeline', () => {
  it('shows records newest first, grouped by year, with issuer and verification', async () => {
    mount([OLD, ENR, AWD])
    await screen.findByText('Sustainability Challenge, Finalist')
    const years = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)
    expect(years).toEqual(['2026', '2025'])
    const order = screen.getAllByRole('listitem').map(li => li.id).filter(Boolean)
    expect(order).toEqual(['rec-AWD-2', 'rec-ENR-1', 'rec-IMP-3'])
    expect(screen.getAllByText(/Issued by an approved issuer/).length).toBe(2); expect(screen.getByText(/Revoked by the issuer/)).toBeTruthy()
    expect(screen.getAllByText('Sustainability Competition B').length).toBeGreaterThan(0)
  })
  it('expands record details and connects academic and extracurricular records', async () => {
    mount([ENR, AWD])
    const btn = (await screen.findByText('Sustainability Challenge, Finalist')).closest('button')!
    expect(btn.getAttribute('aria-expanded')).toBe('false'); fireEvent.click(btn); expect(btn.getAttribute('aria-expanded')).toBe('true')
    const panel = document.getElementById(btn.getAttribute('aria-controls')!)!
    expect(within(panel).getByText('Source ID')).toBeTruthy(); expect(within(panel).getByText(/does not prove every detail/)).toBeTruthy()
    expect(within(panel).getByText('Happened while enrolled in')).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Enrollment, Grade 8' }))
    await waitFor(() => expect(document.getElementById('det-ENR-1')).toBeTruthy())
    expect(within(document.getElementById('det-ENR-1')!).getByText('Related records')).toBeTruthy()
  })
  it('filters by category, year, issuer and search, and can clear', async () => {
    mount([OLD, ENR, AWD]); await screen.findByText('Sustainability Challenge, Finalist')
    expect(screen.getByRole('button', { name: /^Academic \(2\)/ })).toBeTruthy()          // revoked records still count; replaced versions are hidden by default
    fireEvent.click(screen.getByRole('button', { name: /^Extracurricular/ }))
    expect(screen.queryByText('Enrollment, Grade 8')).toBeNull(); expect(screen.getByText('Sustainability Challenge, Finalist')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^All/ }))
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2025' } }); expect(screen.getByText('Science fair')).toBeTruthy(); expect(screen.queryByText('Enrollment, Grade 8')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    fireEvent.change(screen.getByLabelText('Issuer'), { target: { value: 'Sustainability Competition B' } }); expect(screen.queryByText('Science fair')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    fireEvent.change(screen.getByLabelText('Search records'), { target: { value: 'gold' } }); expect(screen.getByText('Science fair')).toBeTruthy(); expect(screen.queryByText('Enrollment, Grade 8')).toBeNull()
    expect(screen.getByText(/Showing 1 of 3 records/)).toBeTruthy()
  })
  it('sorts oldest first on request', async () => {
    mount([OLD, ENR, AWD]); await screen.findByText('Science fair')
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'old' } })
    expect(screen.getAllByRole('listitem').map(li => li.id).filter(Boolean)).toEqual(['rec-IMP-3', 'rec-ENR-1', 'rec-AWD-2'])
  })
  it('hides replaced versions until asked and keeps them reachable from the current version', async () => {
    const v1 = E({ id: 'ENR-1', title: 'Enrollment, Grade 8', date: '2026-07-05', type: 'enrollment', category: 'academic', status: 'superseded', current: false, replacedBy: 'ENR-1-v2', verification: { code: 'superseded', label: 'Replaced by a corrected version' } })
    const v2 = E({ id: 'ENR-1-v2', title: 'Enrollment, Grade 9', date: '2026-07-05', type: 'enrollment', category: 'academic', replaces: 'ENR-1', history: [{ id: 'ENR-1', title: 'Enrollment, Grade 8', issuedAt: '2026-07-05', status: 'superseded' }] })
    mount([v1, v2]); await screen.findByText('Enrollment, Grade 9')
    expect(screen.queryByText('Enrollment, Grade 8')).toBeNull()
    fireEvent.click(screen.getByText('Enrollment, Grade 9').closest('button')!); fireEvent.click(screen.getByRole('button', { name: 'Enrollment, Grade 8' }))
    await waitFor(() => expect(document.getElementById('rec-ENR-1')).toBeTruthy())
  })
  it('offers a correction request only to the learner side', async () => {
    const go = mount([ENR]); fireEvent.click((await screen.findByText('Enrollment, Grade 8')).closest('button')!)
    fireEvent.click(within(document.getElementById('det-ENR-1')!).getByRole('button', { name: 'Request a correction' })); expect(go).toHaveBeenCalledWith('records')
  })
  it('does not offer corrections to staff roles', async () => {
    mount([ENR], 'en', 'teacher'); fireEvent.click((await screen.findByText('Enrollment, Grade 8')).closest('button')!)
    expect(within(document.getElementById('det-ENR-1')!).queryByRole('button', { name: 'Request a correction' })).toBeNull()
  })
})

describe('timeline empty and error states', () => {
  it('explains an empty timeline without filters', async () => { mount([]); await screen.findByText('No records yet'); expect(screen.queryByRole('search')).toBeNull() })
  it('explains an empty category', async () => { mount([ENR]); await screen.findByText('Enrollment, Grade 8'); fireEvent.click(screen.getByRole('button', { name: /^Extracurricular/ })); await screen.findByText('No extracurricular records yet') })
  it('explains when filters match nothing and offers to clear them', async () => {
    mount([ENR, AWD]); await screen.findByText('Enrollment, Grade 8'); fireEvent.change(screen.getByLabelText('Search records'), { target: { value: 'zzz' } })
    await screen.findByText('No records match these filters'); fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]); await screen.findByText('Enrollment, Grade 8')
  })
  it('shows the server reason when the role cannot browse the profile', async () => { mount([], 'en', 'reviewer', false); await screen.findByText('This role cannot browse a learner profile') })
})

describe('timeline in Arabic', () => {
  it('translates headings, filters, labels, verification and empty states', async () => {
    mount([ENR, AWD], 'ar'); await screen.findByRole('heading', { name: 'مسار التعلّم' })
    expect(screen.getByRole('group', { name: 'الفئة' })).toBeTruthy()
    for (const x of ['السنة', 'الترتيب', 'ابحث في السجلات', 'إظهار النسخ المستبدَلة']) expect(screen.getAllByText(x).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/صادر عن جهة مصدِرة معتمدة/).length).toBe(2)
    fireEvent.click(screen.getAllByRole('button', { expanded: false })[0]); expect(screen.getAllByText('رقم المصدر').length).toBeGreaterThan(0)
    cleanup(); mount([], 'ar'); await screen.findByText('لا توجد سجلات بعد')
  })
  it('formats dates in Arabic and uses logical (RTL-safe) spacing', async () => {
    mount([AWD], 'ar'); await screen.findAllByText(/2026|٢٠٢٦/)
    const html = document.body.innerHTML; expect(html).toContain('border-s-[3px]'); expect(html).not.toMatch(/\b(ml|mr|pl|pr)-\d/)
  })
})
