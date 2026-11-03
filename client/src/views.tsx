import { useEffect, useState } from 'react'
import { api } from './api'
import type { Data, User, View } from './types'
import { useLang, useT } from './i18n'
import { Badge, Card, Disclosure, Err, Field, Lead, List, Note, PageHead, Row, Simulated, Status, UAEButton, UAEDataTable, applyStatus, fmtDate, inputCls, recStatus } from './ui'
import { Saqr } from './learner'

export interface P { user: User; data: Data; reload: () => Promise<void>; go: (v: View | any, opts?: any) => void; pending: string | null; clearPending: () => void; intent?: any; seen?: Record<string, boolean>; openA11y?: () => void }
const OPTS: [string, string][] = [['sara', 'Sara'], ['parent', 'Parent supporter'], ['advisor', 'Academic advisor'], ['teacher', 'Teacher'], ['coordinator', 'Learning-support coordinator'], ['admin', 'University registrar (issuer)'], ['organizer', 'Competition organizer'], ['trainer', 'Training provider'], ['reviewer', 'Scholarship reviewer'], ['governance', 'Governance administrator'], ['operator', 'Platform operator'], ['stranger', 'Unlisted staff member']]

// ---------------- Sign in (Tayseer hero + Tayseer sign-in) ----------------
const PERSONAS: [string, string, string][] = [['sara', 'Sara', 'Learner'], ['parent', 'Parent supporter', 'Parent/Guardian Supporter'], ['advisor', 'Academic advisor', 'Al Noor University'], ['teacher', 'Teacher', 'Al Noor University'], ['coordinator', 'Learning-support coordinator', 'Al Noor University'], ['admin', 'University registrar (issuer)', 'Al Noor University'], ['organizer', 'Competition organizer', 'Sustainability Competition B'], ['trainer', 'Training provider', 'Future Skills Academy'], ['reviewer', 'Scholarship reviewer', 'Hope Foundation'], ['governance', 'Governance administrator', 'Tayseer Governance'], ['operator', 'Platform operator', 'Tayseer Operations']]
export function Login({ onUser, pending }: { onUser: (u: User) => void; pending: boolean }) {
  const t = useT(), [step, setStep] = useState<'start' | 'pass'>('start'), [e, setE] = useState(''), [busy, setBusy] = useState('')
  // UAE PASS is simulated: choosing a demo person signs in to that person's own demo account. No credentials are typed anywhere.
  const pass = async (id: string) => { setBusy(id); const r = await api('/login', { user: id, pin: '1234' }); setBusy(''); r.ok ? onUser(r.user) : setE(t(r.error)) }
  return <section className="enter grid items-center gap-10 md:grid-cols-[1.15fr_1fr] md:py-10">
    <div><p className="eyebrow">{t('UAE lifelong learner card · prototype')}</p>
      <p className="display my-4 text-5xl md:text-7xl">{t('One card that grows with you.')}</p>
      <p className="mb-6 max-w-prose text-lg text-muted">{t('Keep your enrollment, marksheets, certificates and achievements in one secure learner card. Schools, universities and organizers issue records straight to it. Reuse verified details, apply once, and share only what you choose.')}</p>
      <ul className="mb-8 grid max-w-xl gap-x-6 gap-y-3 text-sm sm:grid-cols-3">{[['Connect', 'Your school or university sends your records.'], ['Apply once', 'Verified details are reused.'], ['Share selectively', 'Pick records, recipient and expiry.']].map((x, i) =>
        <li key={x[0]} className="border-t border-line pt-2"><span className="mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span><b className="mt-1 block">{t(x[0])}</b><span className="text-muted">{t(x[1])}</span></li>)}</ul>
      <div aria-hidden className="guilloche relative hidden max-w-sm -rotate-[4deg] rounded-[18px] bg-[#1f1a12] p-5 text-[#f4efe2] shadow-[0_30px_60px_-30px_rgba(31,26,18,.7)] md:block" style={{ aspectRatio: '1.586/1' }}>
        <div className="flex items-start justify-between"><p className="eyebrow card-accent">{t('Tayseer learner card')}</p><span className="rounded-full border border-current px-2 py-0.5 text-[10px] card-accent">{t('Sample')}</span></div>
        <p className="display mt-5 text-3xl">{t('Your name')}</p><p className="text-sm text-[#d8cdb4]">{t('Your school or university')} · {t('Curriculum')}</p>
        <p className="mt-1 text-xs text-[#b5aa92]">{t('Previous schools, transfers and achievements, all in one place')}</p>
        <p className="mono absolute bottom-5 start-5 text-sm tracking-widest">ULL-•••• ••••••</p>
        <svg className="absolute bottom-5 end-5 h-12 w-12 rounded-md bg-white p-1" viewBox="0 0 10 10"><path fill="#1f1a12" d="M0 0h3v3H0zM7 0h3v3H7zM0 7h3v3H0zM4 4h2v2H4zM7 7h1v1H7zM8 5h1v1H8zM5 8h1v2H5zM4 1h1v2H4z" /></svg></div></div>
    <div className="rounded-[18px] border border-line bg-card p-6 sm:p-8">
      {step === 'start' ? <><h1 className="display text-3xl">{t('Sign in')}</h1><p className="mt-2 text-muted">{t('Tayseer uses UAE PASS, the UAE national digital identity, to sign in.')}</p>
        <button onClick={() => setStep('pass')} className="mt-6 flex w-full min-h-[52px] items-center justify-center gap-3 rounded-[10px] bg-[#1f1a12] px-4 font-medium text-white hover:bg-black cursor-pointer">
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3a7 7 0 0 0-7 7v3M19 10a7 7 0 0 0-11.5-5.4M12 7a3 3 0 0 0-3 3v4a8 8 0 0 0 1 4M15 10v3a11 11 0 0 1-1.5 6M12 11v3" /></svg>{t('Sign in with UAE PASS')}</button>
        <p className="mt-4 rounded-lg bg-soft px-3 py-2 text-xs text-muted">{t('Demo: UAE PASS is simulated in this prototype. You will not be asked for a username, password, Emirates ID or OTP.')}</p>
        {pending && <Note>{t('Sign in to open the sharing link you scanned.')}</Note>}</>
        : <><div className="flex items-baseline justify-between gap-2"><h1 className="display text-2xl">{t('Sign in')}</h1><button className="text-sm text-primary underline cursor-pointer" onClick={() => setStep('start')}>{t('Back')}</button></div>
          <p className="mt-1 text-sm text-muted">{t('UAE PASS (simulated): choose who is signing in. Each person has their own account.')}</p>
          <ul className="mt-4 max-h-[26rem] divide-y divide-line overflow-y-auto rounded-xl border border-line">{PERSONAS.map(([id, n, org]) => <li key={id}><button disabled={!!busy} onClick={() => pass(id)} className="flex w-full min-h-[52px] items-center gap-3 px-3 py-2 text-start hover:bg-soft cursor-pointer disabled:opacity-60">
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-soft text-sm font-semibold text-primary">{t(n).slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block font-medium">{t(n)}</span><span className="block text-xs text-muted">{t(org)}</span></span>
            <span aria-hidden className="text-muted rtl:-scale-x-100">{busy === id ? '…' : '→'}</span></button></li>)}</ul>
          <Err m={e} /></>}
    </div>
  </section>
}

// ---------------- Teacher / advisor: several learners (demo cohort + Sara) ----------------
function LearnerPicker({ role, children }: { role: string; children: React.ReactNode }) {
  const t = useT(), lang = useLang(), [list, setList] = useState<any[]>([]), [q, setQ] = useState(''), [sel, setSel] = useState('ULL-2026-0048213'), [d, setD] = useState<any>(null)
  useEffect(() => { api('/learners').then(r => r.ok && setList(r.learners)) }, [])
  useEffect(() => { if (sel === 'ULL-2026-0048213') { setD(null); return } api('/learners/' + sel).then(r => setD(r)) }, [sel])
  const shown = list.filter(l => !q.trim() || (l.name + ' ' + l.ref + ' ' + l.curriculum).toLowerCase().includes(q.trim().toLowerCase())), cur = list.find(l => l.ref === sel)
  return <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
    <aside aria-label={t('Learners')}><label className="block text-sm font-medium">{t('Search learners')}<input type="search" className={inputCls} value={q} onChange={e => setQ(e.target.value)} placeholder={t('Name or learner ID')} /></label>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-card">{shown.map(l => <li key={l.ref}><button aria-current={sel === l.ref ? 'true' : undefined} onClick={() => setSel(l.ref)} className={`w-full px-3 py-2 text-start text-sm cursor-pointer ${sel === l.ref ? 'bg-soft' : 'hover:bg-soft/60'}`}>
        <b className="block">{t(l.name)}</b><span className="block font-mono text-xs text-muted">{l.ref}</span><span className="block text-xs text-muted">{l.grade} · {l.curriculum}</span>{!l.access && <span className="block text-xs text-warn">{t('No access authorised')}</span>}</button></li>)}</ul>
      <p className="mt-2 text-xs text-muted">{t('Sample learners and IDs are demo data.')}</p></aside>
    <div className="min-w-0">{cur && <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2"><div><h2 className="text-xl font-bold">{t(cur.name)}</h2><p className="text-sm text-muted"><span className="font-mono">{cur.ref}</span> · {t(cur.school)} · {cur.curriculum} · {cur.grade}</p></div><span className="text-sm">{t('Academic status')}: <b>{t(cur.status)}</b></span></div>}
      {sel === 'ULL-2026-0048213' ? children : !d ? <p role="status">{t('Loading…')}</p> : !d.ok ? <Card><b>{t(d.error)}</b><p className="mt-1 text-sm text-muted">{t('Records appear only when the learner authorises your role.')}</p></Card>
        : <div className="grid gap-4 md:grid-cols-2"><Card><h3 className="font-bold">{t('Academic timeline')}</h3><ol className="mt-2 border-s-[3px] border-primary">{d.timeline.map((x: string[], i: number) => <li key={i} className="pb-2 ps-3 text-sm"><span className="text-xs text-muted">{x[0]}</span><br /><b>{x[1]}</b> · {x[2]}</li>)}</ol></Card>
          <Card><h3 className="font-bold">{t('Authorised records')}</h3><p className="text-xs text-muted">{t('You can see')}: {d.scope.map((x: string) => t(x === 'academic' ? 'Academic' : 'Achievements')).join(', ')}</p><List>{d.records.map((r: any) => <li key={r.title} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1">{r.title}<br /><small className="text-muted">{r.issuer} · {fmtDate(r.date, lang)}</small></span><Status code="verified" /></li>)}</List>
            <p className="text-xs text-muted">{t('Applications and support documents are never shown here.')}</p></Card></div>}</div>
  </div>
}

// ---------------- Teacher ----------------
export function ClassView({ data, reload }: P) {
  const t = useT(), lang = useLang(), [text, setText] = useState(''), [m, setM] = useState('')
  return <section className="enter"><PageHead title={t('Class view')} lead={t('You see what you need to teach each learner well, never their full file.')} /><LearnerPicker role="teacher">
    <div className="grid gap-4 md:grid-cols-2"><Card><h2 className="text-lg font-bold">{t('Learning')}</h2><List>{data.records.map(x => <li key={x.id} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1">{t(x.title)}<br /><small className="text-muted">{t(x.issuer)} · {fmtDate(x.date, lang)}</small></span><Status code={recStatus(x)} /></li>)}</List></Card>
      <Card><h2 className="text-lg font-bold">{t('Approved support')}</h2><List>{data.support.length ? data.support.map(x => <li key={x.id}>{t(x.text)}</li>) : <li>{t('None yet.')}</li>}</List><p className="hint text-sm text-muted">{t('Requests awaiting approval are not shown to you.')}</p></Card></div>
    <Card className="mt-4"><h2 className="text-lg font-bold">{t('Your observations')}</h2><p className="hint text-sm text-muted">{t('Observations are notes, not official records. They never appear on the learner card.')}</p>
      <List>{data.obs.length ? data.obs.map((o, i) => <li key={i}>{o.text}<br /><small className="text-muted">{t(o.by)}, {o.date}</small> <Badge s="observation">{t('observation, not an official record')}</Badge></li>) : <li>{t('No observations yet.')}</li>}</List>
      <Field label={t('Add an observation')}><input className={inputCls} maxLength={300} value={text} onChange={e => setText(e.target.value)} /></Field><Err m={m} />
      <UAEButton onClick={async () => { const x = await api('/observations', { text }); setM(x.ok ? '' : t(x.error)); x.ok && setText(''); reload() }}>{t('Save observation')}</UAEButton></Card></LearnerPicker></section>
}

// ---------------- Advisor ----------------
export function AdvisingView({ data }: P) {
  const t = useT(), lang = useLang(), [err, setErr] = useState('')
  useEffect(() => { api('/records').then(r => setErr(r.ok ? '' : r.error)) }, [data.records])
  const adv = data.advice, note = !adv ? '' : adv.basis.length ? `${t('Sara holds an active award:')} ${t(adv.basis[0])}. ${t('Discuss whether she wants to explore a related elective or club.')}` : t('No active achievements yet. Discuss what Sara would like to try next.')
  return <section className="enter"><PageHead title={t('Advising')} lead={t('Each learner chooses which kinds of records you see. Applications and support documents are never shown to advisors.')} /><LearnerPicker role="advisor">
    {err ? <Card><b>{t(err)}</b><p className="mt-1 text-sm text-muted">{t('Sara can turn advisor access on in Support & Access.')}</p></Card>
      : <><div className="grid gap-4 md:grid-cols-2"><Card><h2 className="text-lg font-bold">{t('Records Sara shares with you')}</h2><List>{data.records.map(x => <li key={x.id} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1">{t(x.title)}<br /><small className="text-muted">{t(x.issuer)} · {fmtDate(x.date, lang)}</small></span><Status code={recStatus(x)} /></li>)}</List></Card>
        <Card><h2 className="text-lg font-bold">{t('Suggested conversation')}</h2><p>{note}</p><p className="hint mt-2 text-sm text-muted">{t('A prompt based on active records. It decides nothing about eligibility.')}</p></Card></div>
        <Disclosure className="mt-4" title={t('Teacher observations')}><List>{data.obs.length ? data.obs.map((o, i) => <li key={i}>{o.text}<br /><small className="text-muted">{t(o.by)}, {o.date}</small></li>) : <li>{t('No observations yet.')}</li>}</List></Disclosure></>}</LearnerPicker></section>
}

// ---------------- Learning-support coordinator ----------------
export function SupportReqView({ data, reload }: P) {
  const t = useT()
  return <section className="enter"><PageHead title={t('Support requests')} lead={t('Only you approve support. Judges and advisors never see these.')} />
    <Card><List>{data.support.length ? data.support.map(x => <li key={x.id} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1">{t(x.text)}</span><Status code={x.status === 'approved' ? 'active' : 'pending'} />
      {x.status !== 'approved' && <UAEButton variant="secondary" onClick={async () => { await api(`/support/${x.id}/approve`, {}); reload() }}>{t('Approve')}</UAEButton>}</li>) : <li>{t('None yet.')}</li>}</List></Card></section>
}

// ---------------- University issuer (admin): issue, import, mapping, corrections, revoke, log ----------------
const SAMPLE = '[{"source_id":"S1042","activity_name":"Enrollment, BSc Engineering","result":""},{"source_id":"A-9","activity_name":"Engineering design project","result":"A"},{"source_id":"","activity_name":"Row with no ID"}]'
export function IssuerView({ user, data, reload }: P) {
  const t = useT(), lang = useLang(), ist = useIssuerStatus(), mp = data.mapping, [type, setType] = useState('qualification'), [title, setTitle] = useState('BSc Engineering'), [src, setSrc] = useState('GRAD-2027'), [date, setDate] = useState('')
  const [msg, setMsg] = useState(''), [okMsg, setOkMsg] = useState(''), [txt, setTxt] = useState(SAMPLE), [res, setRes] = useState<any>(null), [corr, setCorr] = useState<any[]>([]), [log, setLog] = useState<string[]>([])
  const load = async () => { const c = await api('/corrections'); setCorr(c.ok ? c.corrections : []); const l = await api('/audit'); setLog(l.ok ? l.audit : []); await reload() }
  useEffect(() => { load() }, []) // eslint-disable-line
  const issue = async () => { const r = await api('/records', { type, title, src, ...(date ? { date } : {}) }); setOkMsg(r.ok ? (r.duplicate ? t('Duplicate: this issuer and source ID already exist. No second record created.') : `${t('Issued')} ${r.record.id}`) : ''); setMsg(r.ok ? '' : t('Refused:') + ' ' + t(r.error)); load() }
  const setMap = async (status: string) => { await api('/mapping', { status }); load() }
  const run = async () => { let rows; try { rows = JSON.parse(txt) } catch { return setMsg(t('Not valid JSON')) } const r = await api('/import', { rows }); setMsg(r.ok ? '' : t(r.error)); setRes(r.ok ? r : null); load() }
  const decide = async (id: string, d: string) => { const r = await api(`/corrections/${id}/${d}`, {}); setMsg(r.ok ? '' : t(r.error)); load() }
  const revoke = async (id: string) => { const r = await api(`/records/${id}/revoke`, {}); setMsg(r.ok ? '' : t(r.error)); load() }
  const mine = data.records.filter(r => r.issuer === user.org)
  return <section className="enter"><PageHead eyebrow={t(user.org)} title={t('Issuer dashboard')} lead={t('Issue official records, review correction requests and keep history.')} />
    <Err m={msg} />{okMsg && <p role="status" className="mb-3 font-medium text-ok">✓ {okMsg}</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><h2 className="text-lg font-bold">{t('Issue a record')}</h2>{ist && <p className={`mt-1 border-s-2 ps-3 text-sm ${ist.status === 'approved' ? 'border-ok' : 'border-warn'}`}>{ist.status === 'approved' ? `${t('Approved issuer. May issue')}: ${ist.types.map((x: string) => t(({ enrollment: 'Enrollment', academic: 'Academic result', qualification: 'Qualification', award: 'Award', participation: 'Participation', training: 'Training' } as any)[x] ?? x)).join(', ')}` : t('Waiting for governance approval. The server refuses new records until Tayseer Governance approves this organisation.')}</p>}
        <Field label={t('Record type')}><select className={inputCls} value={type} onChange={e => setType(e.target.value)}>{['enrollment', 'academic', 'qualification', 'award', 'participation'].map(x => <option key={x} value={x}>{t(({ enrollment: 'Enrollment', academic: 'Academic result', qualification: 'Qualification', award: 'Award', participation: 'Participation' } as any)[x])}</option>)}</select></Field>
        <Field label={t('Title')}><input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} /></Field>
        <div className="grid gap-x-3 sm:grid-cols-2"><Field label={t('Source ID')}><input className={inputCls} value={src} onChange={e => setSrc(e.target.value)} /></Field><Field label={t('Date of record')} helper={t('Leave empty for today.')}><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></Field></div>
        <Row><UAEButton onClick={issue}>{t('Issue record')}</UAEButton><UAEButton variant="tertiary" onClick={() => { setType('qualification'); setTitle('BSc Engineering'); setSrc('GRAD-2027') }}>{t('Graduation preset')}</UAEButton></Row></Card>
      <Card><h2 className="text-lg font-bold">{t('Correction requests')}</h2>{corr.length ? <List>{corr.map(c => <li key={c.id}><div className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1"><b>{c.record ? t(c.record.title) : c.recordId}</b> → <i>{c.fix}</i><br /><small className="text-muted">{c.reason}</small></span><Badge s={c.status} /></div>
        {c.status === 'pending' && <Row><UAEButton variant="secondary" onClick={() => decide(c.id, 'approve')}>{t('Approve')}</UAEButton><UAEButton variant="destructive" onClick={() => decide(c.id, 'reject')}>{t('Reject')}</UAEButton></Row>}</li>)}</List> : <p className="text-sm text-muted">{t('No requests yet.')}</p>}</Card>
    </div>
    <Card className="mt-4"><h2 className="text-lg font-bold">{t('Records you issued')}</h2><List>{mine.length ? mine.map(r => <li key={r.id} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1">{t(r.title)} <small className="text-muted">· {r.id} · {fmtDate(r.date, lang)}</small></span><Status code={recStatus(r)} />
      {r.status === 'active' && <UAEButton variant="tertiary" onClick={() => revoke(r.id)}>{t('Revoke')}</UAEButton>}</li>) : <li>{t('None yet.')}</li>}</List></Card>
    <div className="mt-4 flex flex-col gap-3">
      <Disclosure title={<>{t('Import mapping')} <Badge s={mp.status} /></>}><Lead>{t('AI suggests how a school’s labels match Tayseer fields. An admin approves or rejects before any import.')}</Lead>
        <UAEDataTable sortable columns={[{ key: 'a', header: t('School sends') }, { key: 'b', header: t('Tayseer field') }]} rows={mp.suggest.map(x => ({ a: <code>{x[0]}</code>, b: <code>{x[1]}</code> }))} />
        <Row><UAEButton onClick={() => setMap('approved')}>{t('Approve mapping')}</UAEButton><UAEButton variant="secondary" onClick={() => setMap('rejected')}>{t('Reject mapping')}</UAEButton></Row>
        <p className="text-sm text-muted">{mp.status === 'rejected' ? t('Rejected: nothing is imported. The admin edits fields by hand, then approves.') : mp.status === 'approved' ? t('Approved: saved and reused for future imports.') : t('Pending: imports are blocked until approved.')}</p></Disclosure>
      <Disclosure title={t('Import school records')}><Lead>{t('Paste JSON rows. Mapping: activity_name → title, result → achievementLevel. Duplicates are matched on issuer + source ID.')}</Lead>
        <textarea rows={5} className={inputCls + ' font-mono text-xs'} aria-label={t('Import school records')} value={txt} onChange={e => setTxt(e.target.value)} />
        <Row><UAEButton onClick={run}>{t('Run import')}</UAEButton></Row>
        {res && <ul className="text-sm"><li>{t('Accepted')}: {res.accepted}</li><li>{t('Duplicates')}: {res.duplicates}</li><li>{t('Conflicts')}: {res.conflicts}</li>{res.rejected.map((x: string) => <li key={x}>{x}</li>)}</ul>}</Disclosure>
      <Disclosure title={t('Activity log')}><Lead>{t('This log is editable demo data, not tamper-proof.')}</Lead><ul className="text-xs font-mono break-all">{log.slice(-15).map((l, i) => <li key={i}>{l}</li>)}</ul></Disclosure>
    </div></section>
}

function useIssuerStatus() { const [st, setSt] = useState<any>(null); const load = () => api('/issuer-status').then(r => r.ok && setSt(r)); useEffect(() => { load() }, []); return st }
const IssuerBanner = ({ st }: { st: any }) => !st ? null : st.status === 'approved'
  ? <p className="mb-4 border-s-2 border-ok ps-3 text-sm"><b>Approved issuer.</b> {st.org} may issue: {st.types.join(', ')}.</p>
  : <div role="status" className="mb-4 border-s-2 border-warn ps-3 text-sm"><b>Waiting for governance approval.</b> {st.org} is {st.status}, so the server refuses new records until Tayseer Governance approves it. In the demo: account menu → Governance administrator → approve {st.org}.</div>
// ---- Secondary screens: English only (not translated), clearly labelled ----
const EN = () => <p className="hint mb-3 text-sm text-muted">English only: secondary screen, not translated. Proposed demo rules, not an actual national authority.</p>
const useGet = (path: string) => { const [d, setD] = useState<any>(null), [e, setE] = useState(''); const load = async () => { const r = await api(path); r.ok ? (setD(r), setE('')) : setE(r.error) }; useEffect(() => { load() }, []); return { d, e, load } } // eslint-disable-line
const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2 text-lg font-bold">{children}</h2>
const Th = ({ children }: { children?: React.ReactNode }) => <th className="p-2 text-start font-semibold">{children}</th>
const Td = ({ children }: { children?: React.ReactNode }) => <td className="p-2 align-top">{children}</td>
function Clock({ reload }: { reload?: () => void }) {
  const { d, load } = useGet('/state'), [m, setM] = useState('')
  const adv = async (days: number) => { const r = await api('/clock', { days }); setM(r.ok ? '' : r.error); load(); reload && reload() }
  return <Card><H>Demo clock: {d ? d.clock : '…'}</H><Row>{[1, 30, 100].map(n => <UAEButton key={n} variant="secondary" onClick={() => adv(n)}>+{n} days</UAEButton>)}</Row><Err m={m} /></Card>
}
function Retention({ canHold }: { canHold: boolean }) {
  const { d, e, load } = useGet('/retention'), [res, setRes] = useState<string[] | null>(null), [m, setM] = useState('')
  if (!d) return <Err m={e} />
  const review = async () => { const r = await api('/retention/review', {}); setRes(r.ok ? r.result : null); setM(r.ok ? '' : r.error); load() }
  const hold = async (cat: string, h: boolean) => { await api('/retention/hold', { cat, hold: h }); load() }
  return <Card><H>Retention (demo rules, {d.today})</H><p className="text-sm text-muted">{d.note}</p>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-line"><Th>Category</Th><Th>Purpose</Th><Th>Trigger</Th><Th>Sample days</Th><Th>Hold</Th></tr></thead><tbody>{d.rules.map((r: any) => <tr key={r.cat} className="border-b border-line"><Td>{r.cat}</Td><Td>{r.purpose}</Td><Td>{r.trigger}</Td><Td>{r.days}</Td><Td>{r.hold ? 'On' : 'Off'} {canHold && <UAEButton variant="tertiary" onClick={() => hold(r.cat, !r.hold)}>{r.hold ? 'Release' : 'Hold'}</UAEButton>}</Td></tr>)}</tbody></table></div>
    <p className="mt-2 text-sm">Attachments (separate from long-term learner records): {d.attach.map((a: any) => a.id + ' ' + a.status).join('; ')}</p>
    <Row><UAEButton onClick={review}>Run retention review</UAEButton></Row>{res && <p>{res.join('; ') || 'Nothing due yet. Advance the demo clock.'}</p>}<Err m={m} /></Card>
}
export function GovView(_: P) {
  const { d, e, load } = useGet('/gov'), [why, setWhy] = useState('Verified for the demo'), [m, setM] = useState(''), [ok, setOk] = useState(''), [rowT, setRowT] = useState<Record<string, string[]>>({})
  const DEF: Record<string, string[]> = { 'ISS-A': ['enrollment', 'academic', 'award', 'participation', 'qualification'], 'ISS-B': ['award', 'participation'], 'ISS-C': ['training'] }, ALL = ['enrollment', 'academic', 'award', 'participation', 'training', 'qualification']
  const typesOf = (i: any) => rowT[i.id] ?? (i.types?.length ? i.types : DEF[i.id] ?? [])
  const act = async (i: any, status: string) => { const r = await api('/gov/issuer', { id: i.id, status, reason: why, types: typesOf(i) }); setM(r.ok ? '' : r.error); setOk(r.ok ? `${i.org}: ${status}${status === 'approved' ? ' for ' + typesOf(i).join(', ') : ''}. Recorded in the activity log.` : ''); load() }
  const gl = async (status: string) => { const r = await api('/gov/guardian', { status }); setM(r.ok ? '' : r.error); setOk(r.ok ? `Supporter link ${status}.` : ''); load() }
  return <section className="enter"><PageHead eyebrow="Tayseer Governance" title="Governance" /><EN /><Err m={e || m} />{ok && <p role="status" className="mb-3 font-medium text-ok">✓ {ok}</p>}
    {d && <div className="flex flex-col gap-4"><Card><H>Issuer applications</H><Field label="Reason recorded with each decision (required)"><input className={inputCls} value={why} onChange={x => setWhy(x.target.value)} /></Field>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-line"><Th>ID</Th><Th>Organisation</Th><Th>Status</Th><Th>Permitted record types</Th><Th>Decided by</Th><Th>Action</Th></tr></thead><tbody>{d.issuers.map((i: any) => <tr key={i.id} className="border-b border-line"><Td>{i.id}</Td><Td>{i.org}</Td><Td><Badge s={i.status}>{i.status}</Badge></Td><Td><div className="flex flex-wrap gap-x-3 gap-y-1">{ALL.map(ty => <label key={ty} className="inline-flex items-center gap-1 text-xs"><input type="checkbox" className="accent-[var(--primary)]" checked={typesOf(i).includes(ty)} onChange={ev => setRowT(o => ({ ...o, [i.id]: ev.target.checked ? [...typesOf(i), ty] : typesOf(i).filter((x: string) => x !== ty) }))} />{ty}</label>)}</div></Td><Td>{i.by || ''}</Td>
        <Td><div className="flex flex-wrap gap-1"><UAEButton variant="secondary" onClick={() => act(i, 'approved')}>Approve</UAEButton><UAEButton variant="secondary" onClick={() => act(i, 'rejected')}>Reject</UAEButton><UAEButton variant="destructive" onClick={() => act(i, 'suspended')}>Suspend</UAEButton></div></Td></tr>)}</tbody></table></div>
      <p className="text-sm text-muted">Suspending blocks new issuance only. Existing records stay as issued.</p></Card>
      <Card><H>Supporter relationship check (Sara ↔ parent/guardian supporter)</H><p>Status: <Badge s={d.guardian.status}>{d.guardian.status}</Badge> · review by {new Date(d.guardian.reviewAt).toISOString().slice(0, 10)}</p><p className="text-sm">Sara's chosen permissions: {Object.entries(d.guardian.perms || {}).filter(x => x[1]).map(x => x[0]).join(', ') || 'none'}</p>
        <Row><UAEButton onClick={() => gl('approved')}>Approve link</UAEButton><UAEButton variant="secondary" onClick={() => gl('rejected')}>Reject link</UAEButton></Row><p className="text-sm text-muted">Governance verifies the relationship only. Sara decides what the supporter may do, and only Sara can re-invite after revoking.</p></Card>
      <Clock reload={load} /><Retention canHold /><Card><H>Activity log (editable demo data, not tamper-proof)</H><ul className="text-xs font-mono break-all">{d.audit.map((l: string, i: number) => <li key={i}>{l}</li>)}</ul></Card></div>}</section>
}
export function OrganizeView({ user }: P) {
  const comp = user.org === 'Sustainability Competition B', ist = useIssuerStatus(), allowed: string[] = ist?.status === 'approved' ? ist.types : []
  const [type, setType] = useState(comp ? 'award' : 'training'), [title, setTitle] = useState(comp ? 'Sustainability Challenge, Finalist' : 'Solar PV Installer Course'), [m, setM] = useState(''), [ok, setOk] = useState(false), [st, setSt] = useState('')
  const [app, setApp] = useState<any>(null), [corr, setCorr] = useState<any[]>([]), [log, setLog] = useState('')
  const load = async () => { const a = await api('/apply'); setApp(a.ok ? a.apply : null); const c = await api('/corrections'); setCorr(c.ok ? c.corrections : []) }
  useEffect(() => { load() }, [])
  const issue = async () => { const r = await api('/issue', { type, title, src: comp ? 'AWARD-77' : 'TRN-1' }); setOk(r.ok); setM(r.ok ? (r.duplicate ? 'Duplicate ignored: already issued.' : 'Issued ' + r.record.id + ' to Sara’s card') : r.error) }
  const status = async (s: string) => { const r = await api('/apply/status', { status: s }); setSt(r.ok ? 'Application status: ' + s : r.error); load() }
  const decide = async (id: string, d: string) => { const r = await api(`/corrections/${id}/${d}`, {}); setLog(r.ok ? `Correction ${d}d` : r.error); load() }
  return <section className="enter"><PageHead eyebrow={user.org} title={comp ? 'Competition organizer' : 'Training provider'} /><EN /><IssuerBanner st={ist} />
    <div className="grid gap-4 lg:grid-cols-2">
      {comp && <Card><H>Application: Sustainability Challenge 2026</H>{app && app.submitted ? <><div className="flex flex-wrap items-center gap-2"><b>{app.name}</b><Status code={applyStatus(app)} /></div><p className="text-sm whitespace-pre-wrap">{app.problem}</p>
        <p className="mt-1 text-xs text-muted">Submitted by Sara{app.helpedBy === 'parent' ? ' (draft prepared with her parent supporter)' : ''}. Drafts are never visible to organizers.</p>
        <Row>{['under review', 'more information requested', 'accepted', 'declined'].map(s => <UAEButton key={s} variant="secondary" onClick={() => status(s)}>{s}</UAEButton>)}</Row></> : <p className="text-sm text-muted">No submitted application yet. Drafts stay private.</p>}<p role="status" className="text-sm">{st}</p></Card>}
      <Card><H>Issue a record to Sara</H><Field label="Record type"><select className={inputCls} value={type} onChange={e => setType(e.target.value)}>{(allowed.length ? allowed : comp ? ['award', 'participation'] : ['training']).map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Title"><input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} /></Field><Row><UAEButton disabled={ist?.status !== 'approved'} onClick={issue}>Issue</UAEButton></Row><p role="status" className={ok ? 'text-ok font-medium' : 'text-bad'}>{m && (ok ? 'OK: ' : 'Rejected by the server: ') + m}</p>
        <p className="hint text-sm text-muted">Only record types governance approved for {user.org} are offered. Only universities may issue qualifications.</p></Card>
      <Card><H>Correction requests for your records</H>{corr.length ? <List>{corr.map(c => <li key={c.id}><b>{c.record ? c.record.title : c.recordId}</b> → <i>{c.fix}</i> <Badge s={c.status}>{c.status}</Badge><br /><small className="text-muted">{c.reason}</small>
        {c.status === 'pending' && <Row><UAEButton variant="secondary" onClick={() => decide(c.id, 'approve')}>Approve and reissue</UAEButton><UAEButton variant="destructive" onClick={() => decide(c.id, 'reject')}>Reject</UAEButton></Row>}</li>)}</List> : <p className="text-sm text-muted">No requests.</p>}<p role="status" className="text-sm">{log}</p></Card>
    </div></section>
}
export function OpsView(_: P) {
  const { d, e, load } = useGet('/ops'), [m, setM] = useState('')
  const reset = async () => { if (!window.confirm('Reset all demo data?')) return; const r = await api('/reset', {}); setM(r.ok ? 'Demo data reset.' : r.error); load() }
  return <section className="enter"><PageHead title="Platform operations" lead="Operators manage the service, not learner records. This role has no access to records, support documents or shares." /><EN /><Err m={e || m} />
    {d && <div className="flex flex-col gap-4"><div className="grid gap-4 md:grid-cols-2"><Card><H>Background jobs</H><ul className="text-sm">{d.jobs.map((j: any) => <li key={j.name}>{j.name}: {j.status}</li>)}</ul></Card><Card><H>Integration health (simulated)</H><ul className="text-sm">{d.health.map((j: any) => <li key={j.name}>{j.name}: {j.status}</li>)}</ul></Card></div>
      <Card><H>Import failures and technical events</H><ul className="text-xs font-mono break-all">{d.events.length ? d.events.map((l: string, i: number) => <li key={i}>{l}</li>) : <li>None</li>}</ul></Card><Clock reload={load} /><Retention canHold={false} /><Row><UAEButton variant="destructive" onClick={reset}>Reset demo data</UAEButton></Row></div>}</section>
}
const FEATS: [string, string, string][] = [['Role permissions, supporter permissions chosen by Sara, advisor scope, import with duplicate and conflict detection, corrections with version history, selective sharing with purpose, expiry, revoke and four server checks', 'Implemented', 'Server memory only'], ['Issuer approval, suspension, issuing limits, guardian link states, onboarding and card reference, deterministic suggestions with reasons, demo clock, retention review', 'Implemented', 'Demo rules'],
  ['Sign-in (demo PIN; no live UAE PASS integration), university connection, guardian verification, organisation membership, integrations, background jobs', 'Simulated', 'Labelled in the UI'], ['Real UAE PASS, official issuer registry, cryptographic record integrity, live AI service, database, legal retention rules, notifications, sign language clips', 'Future dependency', 'Not built']]
const WALK: [string, string, string][] = [
  ['Governance', 'Approve the supporter link (Sara ↔ parent supporter) and issuers ISS-B (award, participation) and ISS-C (training)', 'Setup'],
  ['Sara', 'My Card: confirm details, connect Al Noor University (simulated), create the card', '1 Connect university'],
  ['Sara', 'Support & Access: choose what her parent supporter may do; try Revoke and Invite again', '2 Supporter access'],
  ['Parent supporter', 'Deadlines and Application draft: prepare a draft (cannot submit, share or see support documents)', '2–3 Supporter'],
  ['Sara', 'Opportunities → Apply: profile details reused; review the draft and submit it herself', '3 Apply'],
  ['Organizer', 'Mark the application under review and issue “Sustainability Challenge, Finalist”', '4 Achievement'],
  ['Sara', 'My Learning: open the record, Request a correction; Organizer approves → new version, old one kept', '4 Correction'],
  ['Sara / Advisor', 'Support & Access: limit advisor to academic or achievements; sign in as the advisor to check', '5 Advisor'],
  ['Sara', 'Opportunities: new suggestions with “Why am I seeing this?”, never an eligibility decision', '6 Discover'],
  ['Sara', 'Sharing: Hope Foundation → Scholarship application → select enrollment + finalist → review expiry → confirm', '7 Share'],
  ['Reviewer', 'Paste the link: four server checks, then only the authorized records; Sara revokes → access denied', '7 Review'],
  ['Registrar', 'Issuer dashboard: approve mapping, use the graduation preset to issue the BSc qualification', '8 Graduate'],
  ['Training provider', 'Issue a training record; it joins the same lifelong profile', '8 Keep growing']]
export function DemoView(_: P) {
  const [done, setDone] = useState<number[]>([])
  return <section className="enter"><PageHead title="Demo guide" lead="Sara’s story, step by step. Switch accounts from the account menu (demo convenience, not a production mechanism)." /><EN />
    <Card><H>Guided walkthrough</H><ol className="flex flex-col gap-1">{WALK.map((w, i) => <li key={i}><label className="flex min-h-11 items-start gap-3 py-1"><input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--primary)]" checked={done.includes(i)} onChange={() => setDone(done.includes(i) ? done.filter(x => x !== i) : [...done, i])} />
      <span><span className="me-2 rounded-full bg-soft px-2 py-0.5 text-xs font-medium">{w[2]}</span><b>{w[0]}:</b> {w[1]}</span></label></li>)}</ol></Card>
    <Card className="mt-4"><H>Feature status</H><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-line"><Th>Feature</Th><Th>Status</Th><Th>Note</Th></tr></thead><tbody>{FEATS.map(f => <tr key={f[0]} className="border-b border-line"><Td>{f[0]}</Td><Td><b>{f[1]}</b></Td><Td>{f[2]}</Td></tr>)}</tbody></table></div></Card>
    <div className="mt-4"><Clock /></div></section>
}

// ---------------- Interoperability & Standards (institutional view; English only, secondary screen) ----------------
const ST: Record<string, string> = { demo: 'Shown in this demo', proposed: 'Proposed integration', validate: 'Requires validation' }
const Pill = ({ k }: { k: string }) => <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${k === 'demo' ? 'border-ok text-ok' : k === 'validate' ? 'border-warn text-warn' : 'border-line text-muted'}`}>{ST[k]}</span>
const FW: [string, string, string, string[]][] = [
  ['W3C Verifiable Credentials Data Model 2.0', 'Each issued academic record becomes a credential that keeps issuer, subject, credential type, evidence and a status entry, so a recipient can check it was not revoked.', 'Tayseer records already keep issuer, learner, type, dates, status and revocation. The JSON below shows the shape; it is unsigned.', ['demo', 'proposed']],
  ['1EdTech Comprehensive Learner Record (CLR) 2.0', 'A cumulative record of the learner’s history: schools, curricula, results, competencies and extracurricular achievements in one structured document.', 'The learning timeline and Previous Learning Records are organised the way a CLR would group them. No CLR export yet.', ['demo', 'proposed']],
  ['Open Badges 3.0', 'Portable evidence for competitions, volunteering and skills, issued by organisers and training providers.', 'Competition, volunteering and training records could be issued as badges. Not implemented.', ['proposed']],
  ['OpenID for Verifiable Credential Issuance (OpenID4VCI)', 'A standard flow for an authorised institution to issue a credential into the learner’s wallet.', 'Today issuers post records through the Tayseer API. A wallet issuance flow would replace that.', ['proposed', 'validate']],
  ['OpenID for Verifiable Presentations (OpenID4VP)', 'A standard flow for presenting only selected credentials to a verifier who requested them.', 'The sharing flow (requirements → selection → review → temporary link) mirrors selective presentation, but uses a demo token, not OpenID4VP.', ['demo', 'proposed']],
]
const UAE: [string, string][] = [['UAE Ministry of Education (MOE)', 'Transfer certificates, Grade 9–12 curriculum-change approvals, Grade 12 equivalency; owner of a common record format in the sample pack.'], ['KHDA (Dubai)', 'Private school registration in Dubai; attestation of documents issued by Dubai schools.'],
  ['SPEA (Sharjah)', 'Private school registration in Sharjah; attestation, including e-attestation routes.'], ['MOHESR', 'Licensing of universities; attestation and recognition of higher-education qualifications.'],
  ['TDRA trust services', 'Qualified electronic seals and signatures from licensed trust service providers, if records are signed.'], ['UAE Personal Data Protection Law (PDPL)', 'Consent, purpose limitation, minimisation and access logging when learner data is shared.']]
const VC = { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'MarksheetCredential'], issuer: { id: 'did:example:sample-american-school-sharjah', name: 'Sample American School, Sharjah' }, validFrom: '2023-06-22',
  credentialSubject: { id: 'urn:edupass:learner:ULL-2026-0048213', achievement: { name: 'Grade 10 marksheet', curriculum: 'American (US Common Core)', academicYear: '2022–23', results: [{ subject: 'Chemistry', original: 'A', scale: 'US letter' }, { subject: 'Algebra II', original: 'A-', scale: 'US letter' }] } },
  evidence: [{ type: 'Evidence', name: 'School-issued marksheet DOC-05 (demo)' }], credentialStatus: { type: 'BitstringStatusListEntry', statusPurpose: 'revocation', statusListCredential: 'https://example.invalid/status/1', statusListIndex: '42' } }
export function StandardsView(_: P) {
  const flow = ['Issuing school / university', 'Trusted credential issuance', 'Tayseer learner wallet', 'Learner consent & selective sharing', 'Scholarship provider / receiving school / university', 'Credential verification']
  return <section className="enter"><PageHead title="Interoperability & Standards" lead="How Tayseer could exchange trusted learning records between schools, universities, authorities and scholarship providers." /><EN />
    <Note tone="warn">Tayseer is not certified against these standards and is not integrated with any UAE authority. This page separates what the demo shows, proposed integrations, and items that need validation.</Note>
    <h2 className="mt-5 mb-2 text-lg font-bold">Record flow</h2>
    <ol className="flex flex-wrap items-stretch gap-2 text-sm">{flow.map((f, i) => <li key={f} className="flex items-center gap-2"><span className="rounded-lg border border-line bg-card px-3 py-2">{f}</span>{i < flow.length - 1 && <span aria-hidden className="text-primary rtl:-scale-x-100">→</span>}</li>)}</ol>
    <h2 className="mt-6 mb-2 text-lg font-bold">Frameworks</h2>
    <div className="overflow-x-auto rounded-xl border border-line bg-card"><table className="w-full text-sm"><thead><tr className="border-b border-line"><Th>Framework</Th><Th>Purpose in Tayseer</Th><Th>In this prototype</Th><Th>Status</Th></tr></thead>
      <tbody>{FW.map(f => <tr key={f[0]} className="border-b border-line last:border-0"><Td><b>{f[0]}</b></Td><Td>{f[1]}</Td><Td>{f[2]}</Td><Td><div className="flex flex-col gap-1">{f[3].map(k => <Pill key={k} k={k} />)}</div></Td></tr>)}</tbody></table></div>
    <h2 className="mt-6 mb-2 text-lg font-bold">UAE regulatory and institutional context</h2>
    <ul className="divide-y divide-line rounded-xl border border-line bg-card text-sm">{UAE.map(([a, b]) => <li key={a} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-3 py-2"><b className="w-full sm:w-64 shrink-0">{a}</b><span className="min-w-0 flex-1">{b}</span><Pill k="validate" /></li>)}</ul>
    <h2 className="mt-6 mb-2 text-lg font-bold">Keeping curricula and grading systems in their original form</h2>
    <p className="max-w-prose text-sm">Every result is stored exactly as issued: the original mark or grade and the scale it belongs to (CBSE 9-point, US letter, A Level A*–E, credit hours). A normalized value is optional, kept in a separate field, always marked as derived, and never replaces the original. The crosswalk must come from the official MOE equivalency matrix. Credit transfer between universities is decided only by the receiving university.</p>
    <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-card"><table className="w-full text-sm"><thead><tr className="border-b border-line"><Th>Subject</Th><Th>Original (as issued)</Th><Th>Scale</Th><Th>Normalized (derived, optional)</Th></tr></thead>
      <tbody>{[['Mathematics (CBSE, Grade 9)', '88 / A2', 'CBSE 9-point', '88'], ['Chemistry (American, Grade 10)', 'A', 'US letter', '95'], ['A Level Physics (British, Grade 12)', 'A (predicted)', 'A Level A*–E', 'Not normalized (interim)'], ['MATH 121 Calculus I (university)', 'A- · 4 credit hours', 'US letter / 4.0', 'Not converted. Receiving university decides.']].map(r => <tr key={r[0]} className="border-b border-line last:border-0">{r.map((c, i) => <Td key={i}>{c}</Td>)}</tr>)}</tbody></table></div>
    <p className="mt-1 text-xs text-muted">Values from the sample transfer pack crosswalk v0.1. [VALIDATE]</p>
    <h2 className="mt-6 mb-2 text-lg font-bold">Illustrative credential (W3C VC 2.0 shape, unsigned)</h2>
    <pre className="max-h-80 overflow-auto rounded-xl border border-line bg-card p-3 text-xs" dir="ltr">{JSON.stringify(VC, null, 2)}</pre>
    <p className="mt-1 text-xs text-muted">Demo only: no proof section, no signature, example identifiers.</p></section>
}
