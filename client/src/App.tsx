import { useCallback, useEffect, useRef, useState } from 'react'
import { api, tokenOf } from './api'
import { A11yPanel, useA11y } from './a11y'
import { LangCtx, tr, type Lang } from './i18n'
import { SignPanel } from './components/organisms/SignPanel'
import type { Data, Role, User, View } from './types'
import { Login, ClassView, AdvisingView, SupportReqView, IssuerView, OrganizeView, GovView, OpsView, DemoView, StandardsView } from './views'
import { CardView, LearningView, OppsView, ApplyView, AccessView, ParentOverview } from './learner'
export const CLIENT_VERSION = '0.9.4'
import { ShareView, ReviewView } from './share'
import { Icon } from './icons'
import { SafeerPanel } from './safeer/SafeerPanel'
import { Mascot3D } from './safeer/Mascot3D'

const empty: Data = { records: [], mapping: { status: 'pending', suggest: [] }, apply: { name: '', problem: '', submitted: false, by: null }, support: [], obs: [], advice: null, onb: null, access: { supporter: null, advisor: null }, grants: [], corrections: [] }
const VIEWS: Record<View, (p: any) => React.ReactNode> = { card: CardView, learning: LearningView, opps: OppsView, apply: ApplyView, share: ShareView, access: AccessView,
  class: ClassView, advising: AdvisingView, support: SupportReqView, review: ReviewView, issuer: IssuerView, organize: OrganizeView, gov: GovView, ops: OpsView, demo: DemoView, records: LearningView, standards: StandardsView, overview: ParentOverview }
// Sara's six destinations. Institutional and governance functions live in role dashboards, never in her navigation.
const LABEL: Record<View, string> = { card: 'My Card', learning: 'My Learning', opps: 'Opportunities', apply: 'Applications', share: 'Sharing', access: 'Support & Access',
  class: 'Class view', advising: 'Advising', support: 'Support requests', review: 'Review shared records', issuer: 'Issuer dashboard', organize: 'Organizer', gov: 'Governance', ops: 'Operations', demo: 'Demo guide', records: 'My Learning', standards: 'Interoperability & Standards', overview: 'Overview' }
const PARENT_LABEL: Partial<Record<View, string>> = { learning: 'Sara’s learning', opps: 'Deadlines', apply: 'Application draft', access: 'My permissions' }
export const navFor = (r: Role, d: Data): View[] => {
  if (r === 'sara') return d.onb && !d.onb.onb.ref ? ['card'] : ['card', 'learning', 'opps', 'apply', 'share', 'access']
  if (r === 'parent') { const s = d.access?.supporter, on = s?.status === 'approved', p = s?.perms
    return ['overview', ...(on && p?.records ? ['learning'] : []), ...(on && p?.deadlines ? ['opps'] : []), ...(on && (p?.draft || p?.deadlines) ? ['apply'] : []), 'access'] as View[] }
  return ({ teacher: ['class'], advisor: ['advising'], coordinator: ['support'], reviewer: ['review'], admin: ['issuer', 'standards'], organizer: ['organize'], governance: ['gov', 'standards'], operator: ['ops'] } as Record<string, View[]>)[r] ?? ['demo']
}
const ACCOUNTS: [string, string][] = [['sara', 'Sara'], ['parent', 'Parent supporter'], ['advisor', 'Academic advisor'], ['teacher', 'Teacher'], ['coordinator', 'Learning-support coordinator'], ['admin', 'University registrar (issuer)'], ['organizer', 'Competition organizer'], ['trainer', 'Training provider'], ['reviewer', 'Scholarship reviewer'], ['governance', 'Governance administrator'], ['operator', 'Platform operator']]

const norm = (u: User | null): User | null => u && { ...u, name: ACCOUNTS.find(a => a[0] === u.id)?.[1] ?? u.name }
export default function App() {
  const [user, setUser] = useState<User | null>(null), [ready, setReady] = useState(false), [view, setView] = useState<View>('card'), [lang, setLang] = useState<Lang>('en')
  const [data, setData] = useState<Data>(empty), [panel, setPanel] = useState(false), [a, up, reset] = useA11y(), [pending, setPending] = useState<string | null>(tokenOf(location.hash) ?? null)
  const [srvVersion, setSrvVersion] = useState<string | null>(null), [intent, setIntent] = useState<any>(null), [seen, setSeen] = useState<Record<string, boolean>>({}), [menu, setMenu] = useState(false), [safeer, setSafeer] = useState(false)
  const t = (s: string) => tr(lang, s), verifyRef = (location.hash.match(/#\/verify\/([\w-]+)/) || [])[1]
  const gen = useRef(0) // a reload started for an earlier account must not overwrite the current one
  const reload = useCallback(async () => {
    const g = gen.current
    const [r, m, ap, sp, ob, adv, onb, acc, gr, co] = await Promise.all(['/records', '/mapping', '/apply', '/support', '/observations', '/advice', '/onboarding', '/access', '/grants', '/corrections'].map(p => api(p)))
    if (g !== gen.current) return
    setData({ records: r.ok ? r.records : [], mapping: m.ok ? m.mapping : empty.mapping, apply: ap.ok ? ap.apply : empty.apply, support: sp.ok ? sp.support : [], obs: ob.ok ? ob.obs : [],
      advice: adv.ok ? { basis: adv.basis, note: adv.note } : null, onb: onb.ok ? (onb as any) : null, access: acc.ok ? { supporter: acc.supporter ?? null, advisor: acc.advisor ?? null } : empty.access,
      grants: gr.ok ? gr.grants : [], corrections: co.ok ? co.corrections : [] })
  }, [])
  const go = useCallback((v: View, opts?: any) => { setIntent(opts ?? null); setView(v); setSeen(s => ({ ...s, [v]: true })); window.scrollTo?.(0, 0) }, [])
  useEffect(() => { api('/me').then(r => { setUser(norm(r.user ?? null)); setSrvVersion(r.version ?? 'old'); setReady(true) }) }, [])
  useEffect(() => { if (user) reload() }, [user, reload])
  useEffect(() => { if (user) setView(user.role === 'reviewer' ? 'review' : navFor(user.role, data)[0]) }, [user?.id]) // eslint-disable-line
  useEffect(() => { if (user && pending && user.role === 'reviewer') setView('review') }, [user, pending])
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.title = tr(lang, 'Tayseer') }, [lang])
  const signOut = async () => { gen.current++; await api('/logout', {}); setUser(null); setData(empty); setMenu(false); setSafeer(false) }
  const switchTo = async (id: string) => { gen.current++; await api('/logout', {}); setData(empty); const r = await api('/login', { user: id, pin: '1234' }); setMenu(false); setUser(r.ok ? norm(r.user) : null) }
  const nav = user ? navFor(user.role, data) : []
  const cur: View = user && (nav.includes(view) || view === 'demo' || (view === 'records' && user.role === 'sara')) ? view : nav[0] ?? 'demo'
  const Page = VIEWS[cur]
  const label = (v: View) => t(user?.role === 'parent' && PARENT_LABEL[v] ? PARENT_LABEL[v]! : LABEL[v])
  return <LangCtx.Provider value={lang}><div className="min-h-screen flex flex-col">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-lg focus:p-3 focus:bg-primary focus:text-primary-fg">{t('Skip to content')}</a>
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur no-print">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2">
        <a href="#" onClick={e => { e.preventDefault(); user && go(nav[0]) }} className="me-auto flex items-center gap-2.5 text-fg no-underline">
          <svg aria-hidden width="30" height="22" viewBox="0 0 30 22"><rect x="0.75" y="0.75" width="28.5" height="20.5" rx="4" fill="none" stroke="var(--primary)" strokeWidth="1.5" /><path d="M6 7h10M6 11h7M6 15h10" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" /><circle cx="22" cy="11" r="3.2" fill="var(--primary)" /></svg>
          <span className="font-head text-[1.15rem] font-extrabold tracking-tight">{t('Tayseer')}</span><span className="hidden sm:inline border-s border-line ps-2.5 text-xs text-muted">{lang === 'ar' ? 'Tayseer' : 'تيسير'}</span></a>
        <button className="min-h-[44px] rounded-[10px] border border-line px-3 text-sm font-medium hover:border-fg cursor-pointer" aria-label={t('Switch language')} onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>{lang === 'en' ? 'عربي' : 'English'}</button>
        <button className="min-h-[44px] inline-flex items-center gap-2 rounded-[10px] border border-line px-3 text-sm font-medium hover:border-fg cursor-pointer" aria-haspopup="dialog" aria-label={t('Accessibility')} aria-expanded={panel} aria-controls="panel" onClick={() => setPanel(!panel)}><svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="4.5" r="1.8" /><path d="M5 8.5l7 1.5 7-1.5M12 10v5l-3.5 6M12 15l3.5 6" /></svg><span aria-hidden className="hidden sm:inline">{t('Accessibility')}</span></button>
        {user && <div className="relative">
          <button className="min-h-[44px] flex items-center gap-2 rounded-lg border border-line px-3 text-sm hover:bg-soft cursor-pointer" aria-expanded={menu} aria-controls="acct" onClick={() => setMenu(!menu)}>
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-soft font-bold text-primary">{t(user.name).slice(0, 1)}</span><span className="hidden sm:inline max-w-40 truncate">{t(user.name)}</span><span aria-hidden>▾</span></button>
          {menu && <div id="acct" className="absolute end-0 mt-2 w-72 rounded-2xl border border-line bg-card p-4 shadow-xl z-40">
            <p className="font-bold">{t(user.name)}</p><p className="text-sm text-muted">{t(user.org)}</p>
            <label className="mt-3 block text-sm font-medium">{t('Switch demo account')}<select className="mt-1 block w-full min-h-[44px] rounded-lg border border-line bg-bg px-2" value={user.id} onChange={e => switchTo(e.target.value)}>{ACCOUNTS.map(([id, n]) => <option key={id} value={id}>{t(n)}</option>)}</select></label>
            <p className="hint mt-1 text-xs text-muted">{t('Demo convenience only. Each person normally signs in to their own account.')}</p>
            <div className="mt-3 flex flex-col gap-2"><button className="min-h-[44px] rounded-lg border border-primary px-3 text-sm hover:bg-soft cursor-pointer" onClick={() => { setMenu(false); go('demo') }}>{t('Demo guide')}</button>
              <button className="min-h-[44px] rounded-lg border border-line px-3 text-sm hover:bg-soft cursor-pointer" onClick={signOut}>{t('Sign out')}</button></div></div>}
        </div>}
      </div>
    </header>
    {panel && <A11yPanel a={a} up={up} reset={reset} close={() => setPanel(false)} />}
    {srvVersion && srvVersion !== CLIENT_VERSION && <div role="alert" className="border-b border-warn bg-card px-4 py-3 text-sm"><div className="mx-auto max-w-6xl"><b>{t('The server is running an older version of Tayseer.')}</b> {t('Stop the running server and start it again with npm start, then reload this page. Cards, documents and sharing will look empty until then.')}</div></div>}
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      {verifyRef ? <main id="main"><VerifyView refId={verifyRef} /></main> : !ready ? null : !user ? <main id="main" tabIndex={-1}><Login pending={!!pending} onUser={u => setUser(norm(u))} /></main>
        : <div className="grid gap-6 md:grid-cols-[210px_1fr] md:gap-10">
          {nav.length > 0 && <nav aria-label={t('Main')} className="no-print md:sticky md:top-20 md:self-start">
            <ul className="grid grid-cols-3 gap-1 md:grid-cols-1 md:gap-0 md:border-s md:border-line">{nav.map((v, i) => <li key={v}>
              <button aria-current={v === cur ? 'page' : undefined} onClick={() => go(v)} className={`relative flex w-full min-h-[44px] flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs cursor-pointer md:-ms-px md:flex-row md:gap-3 md:rounded-none md:border-s-2 md:px-4 md:text-start md:text-[0.95rem] ${v === cur ? 'bg-soft font-semibold text-fg md:border-primary md:bg-transparent' : 'text-muted hover:text-fg md:border-transparent'}`}>
                <span aria-hidden className="mono hidden text-[0.7rem] text-muted md:inline">{String(i + 1).padStart(2, '0')}</span><span className="md:hidden"><Icon name={v} /></span><span className="leading-tight">{label(v)}</span></button></li>)}</ul>
            {/* Safeer: the AI assistant, available in every perspective */}
            <button onClick={() => setSafeer(true)} aria-haspopup="dialog" aria-expanded={safeer} aria-label={t('Safeer AI assistant')} className="mt-3 flex w-full min-h-[56px] items-center gap-3 rounded-[14px] border border-line bg-card px-2 py-1.5 text-start hover:border-fg cursor-pointer">
              {!safeer ? <Mascot3D state="idle" size={46} label={t('Safeer the falcon')} /> : <span className="h-[46px] w-[46px]" />}
              <span className="min-w-0"><span className="block text-sm font-semibold">{t('Safeer AI')}</span><span className="block text-xs text-muted">{t('Ask, plan or find your way')}</span></span></button>
          </nav>}
          <main id="main" tabIndex={-1} className="min-w-0">
            <Page user={user} data={data} reload={reload} go={go} intent={intent} seen={seen} pending={pending} clearPending={() => { setPending(null); history.replaceState(null, '', '#') }} openA11y={() => setPanel(true)} />
          </main></div>}
    </div>
    {user && safeer && <SafeerPanel user={user} close={() => setSafeer(false)} go={go} guide={[...nav.map(v => ({ label: label(v), view: v })), ...(user.role === 'sara' ? [{ label: 'Upload missing transfer documents', view: 'learning' as View, opts: { tab: 'university' } }, { label: 'See my previous schools', view: 'learning' as View, opts: { tab: 'previous' } }] : [])]} />}
    {a.sign && <SignPanel view={cur} canRequest={user?.role === 'sara' || user?.role === 'parent'} onClose={() => up({ sign: false })} />}
    <footer className="border-t border-line px-4 py-6 text-sm text-muted no-print"><div className="mx-auto max-w-6xl">{t('Fictional prototype for a hackathon. Not an existing government platform. Data is simulated on the server and resets on restart.')} {t('UAE PASS, university connections and notifications are simulated.')}</div></footer>
  </div></LangCtx.Provider>
}

// Public card status check opened from the card QR (demo): shows status only, no personal data.
function VerifyView({ refId }: { refId: string }) {
  const [d, setD] = useState<any>(null)
  useEffect(() => { fetch('/api/verify/' + encodeURIComponent(refId)).then(r => r.json()).then(setD).catch(() => setD({ valid: false })) }, [refId])
  return <section className="mx-auto max-w-md rounded-2xl border border-line bg-card p-5"><h1 className="text-xl font-bold">Tayseer card check (demo)</h1>
    {!d ? <p role="status">…</p> : <><p className="mt-2">Card <b className="font-mono">{refId}</b>: <b className={d.valid ? 'text-ok' : 'text-bad'}>{d.valid ? 'Active' : 'Not recognised'}</b></p><p className="mt-2 text-sm text-muted">{d.note || 'Demo check only.'}</p></>}</section>
}
