import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { useLang, useT } from './i18n'
import type { Data, Rec, TEntry, View } from './types'
import type { P } from './views'
import { TimelineView } from './timeline'
import { DocViewer, PrevLearning, SchoolTransfer, UniTransfer, DOCLABEL, printEl, useHistory, type Doc, type History } from './docs'
import { Card, Disclosure, Err, Field, Note, PageHead, Row, Simulated, Status, UAEButton, UAEDataTable, applyStatus, fmtDate, inputCls, linkStatus, recStatus } from './ui'

const TYPE: Record<string, string> = { enrollment: 'Enrollment', academic: 'Academic result', award: 'Award', participation: 'Participation', training: 'Training', qualification: 'Qualification' }
const ACH = ['award', 'participation', 'training']
const curOf = (recs: Rec[], type: string) => recs.filter(r => r.type === type && r.status === 'active').slice(-1)[0]
const useTimeline = (dep: unknown) => { const [e, setE] = useState<TEntry[] | null>(null); useEffect(() => { let live = true; api('/timeline').then(r => live && setE(r.ok ? r.entries : [])); return () => { live = false } }, [dep]); return e }

// ---------------- Sara's journey (derived from real server state) ----------------
interface Stage { k: string; title: string; done: boolean; wait?: string; view: View; cta: string; why: string }
export function journey(d: Data, seen: Record<string, boolean>): Stage[] {
  const has = (types: string[]) => d.records.some(r => types.includes(r.type) && r.status !== 'revoked'), sup = d.access?.supporter, adv = d.access?.advisor
  const started = !!(d.apply.name || d.apply.problem)
  return [
    { k: 'connect', title: 'Connect your university', done: !!d.onb?.onb.ref, view: 'card', cta: 'Set up my card', why: 'Your enrollment arrives from your university with its source, date and verification.' },
    { k: 'supporter', title: 'Choose who can help you', done: !!sup && ['approved', 'revoked'].includes(sup.status), wait: sup?.status === 'pending' ? 'Waiting for the relationship check (simulated)' : undefined, view: 'access', cta: 'Manage supporter access', why: 'Invite a parent or guardian as an authorized supporter with limited permissions. You can revoke it any time.' },
    { k: 'apply', title: 'Apply to an opportunity', done: d.apply.submitted, view: started ? 'apply' : 'opps', cta: started ? 'Continue my application' : 'Find an opportunity', why: 'Tayseer reuses details from your card. You add your project and submit it yourself.' },
    { k: 'achieve', title: 'Receive an achievement', done: has(['award', 'participation']), wait: d.apply.submitted && !has(['award', 'participation']) ? 'The organizer issues results after review' : undefined, view: 'learning', cta: 'Open my learning', why: 'Organizers issue results straight to your card. If something is wrong, ask the issuer to correct it.' },
    { k: 'advisor', title: 'Decide what your advisor sees', done: !!adv?.on && seen.access === true || !!adv && !adv.on, view: 'access', cta: 'Review advisor access', why: 'Your advisor sees only the kinds of records you allow, never applications or support documents.' },
    { k: 'discover', title: 'Discover opportunities', done: !!seen.opps, view: 'opps', cta: 'See suggestions', why: 'Suggestions are based on your learning history. They are not eligibility decisions.' },
    { k: 'share', title: 'Share selected records', done: (d.grants ?? []).length > 0, view: 'share', cta: 'Share records', why: 'Pick the records, recipient, purpose and expiry. The reviewer sees only what you choose.' },
    { k: 'grow', title: 'Keep growing: graduation and transfers', done: has(['qualification']), view: 'learning', cta: 'Open my learning', why: 'Transfers stay in your history: SPEA (Sharjah) to KHDA (Dubai) at school, and a UAE national university to a UK-based institution. Your qualification and new training join the same profile.' },
  ]
}

// ---------------- My Card ----------------
export function CardView(p: P) {
  const { user, data } = p, t = useT()
  if (user.role !== 'sara') return <section className="enter"><PageHead title={t('My Card')} /><Card>{t('Only Sara can open her learner card.')}</Card></section>
  if (!data.onb) return <p role="status">{t('Loading…')}</p>
  return data.onb.onb.ref ? <CardHome {...p} /> : <Onboarding {...p} />
}

function Onboarding({ data, reload, openA11y }: P) {
  const t = useT(), lang = useLang(), step = data.onb!.onb.step, [busy, setBusy] = useState(false), [m, setM] = useState('')
  const stage = step < 3 ? 0 : step < 5 ? 1 : step < 6 ? 2 : 3, enr = data.onb!.school
  const advance = async (to: number) => { setBusy(true); setM(''); let s = step; while (s < to) { const r = await api('/onboarding', { action: 'next' }); if (!r.ok) { setM(t(r.error)); break } s = r.onb.step } await reload(); setBusy(false) }
  const create = async () => { setBusy(true); await new Promise(r => setTimeout(r, 600)); const r = await api('/onboarding', { action: 'card' }); setM(r.ok ? '' : t(r.error)); await reload(); setBusy(false) }
  const steps = ['Welcome', 'Connect university', 'Supporters', 'Your card']
  return <section className="enter mx-auto max-w-2xl">
    <ol className="mb-5 grid grid-cols-4 gap-2" aria-label={t('Setup progress')}>{steps.map((s, i) => <li key={s} aria-current={i === stage ? 'step' : undefined} className="text-center text-xs sm:text-sm">
      <span className={`mx-auto mb-1 grid h-8 w-8 place-items-center rounded-full font-bold ${i < stage ? 'bg-ok text-white' : i === stage ? 'bg-primary text-primary-fg' : 'border border-line bg-card text-muted'}`}>{i < stage ? '✓' : i + 1}</span>{t(s)}</li>)}</ol>
    {stage === 0 && <Card><div className="flex items-start gap-4"><Saqr className="hidden sm:block w-24 shrink-0" /><div><h1 className="text-2xl font-bold">{t('Welcome to Tayseer, Sara')}</h1>
      <p className="mt-1">{t('Tayseer keeps one learner profile that grows with you. Your card is the front door. You decide what anyone else sees.')}</p></div></div>
      <h2 className="mt-5 font-bold">{t('Confirm your details (fictional)')}</h2>
      <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 rounded-xl bg-soft p-3 text-sm"><dt className="text-muted">{t('Name')}</dt><dd>{t('Sara A.')}</dd><dt className="text-muted">{t('University learner ID')}</dt><dd>S1042</dd></dl>
      <p className="hint mt-2 text-sm text-muted">{t('These are made-up demo details.')}</p>
      <h2 className="mt-5 font-bold">{t('Language and accessibility')}</h2><p className="hint text-sm text-muted">{t('Use the language button and the Accessibility menu at the top. Your choices are saved on this device and never appear on your card.')}</p>
      <Row><UAEButton variant="secondary" onClick={openA11y}><span aria-hidden>♿</span> {t('Accessibility settings')}</UAEButton></Row>
      <Err m={m} /><Row><UAEButton loading={busy} onClick={() => advance(3)}>{t('My details are correct')}</UAEButton></Row></Card>}
    {stage === 1 && <Card><Simulated>{t('Simulated: university connection')}</Simulated><h1 className="mt-2 text-2xl font-bold">{t('Connect your university')}</h1>
      <p className="mt-1">{t('Al Noor University will send your enrollment record to Tayseer. You will see where it came from and when.')}</p>
      <p className="hint mt-2 text-sm text-muted">{t('This prototype does not contact a real university. No credentials are asked for.')}</p>
      <Err m={m} /><Row><UAEButton loading={busy} onClick={() => advance(5)}>{t('Connect Al Noor University')}</UAEButton></Row></Card>}
    {stage === 2 && <Card><p role="status" className="font-medium text-ok">✓ {t('Connected. Your university sent your enrollment record.')}</p>
      <div className="mt-3 rounded-xl border border-line p-3"><div className="flex flex-wrap items-center gap-2"><b>{t(enr.title)}</b><Status code={recStatus(enr)} /></div>
        <p className="text-sm text-muted">{t(enr.issuer)} · {t('Date of enrollment')}: {fmtDate(enr.date, lang)} · {t('Added to Tayseer')}: {fmtDate(enr.issuedAt, lang)}</p></div>
      <h1 className="mt-5 text-2xl font-bold">{t('Who can help you')}</h1>
      <p className="mt-1">{t('You can invite a parent or guardian as an authorized supporter. They use their own account, get only the permissions you choose, and you can revoke them at any time.')}</p>
      <p className="hint mt-2 text-sm text-muted">{t('You will manage this later in Support & Access.')}</p>
      <Err m={m} /><Row><UAEButton loading={busy} onClick={() => advance(6)}>{t('Continue')}</UAEButton></Row></Card>}
    {stage === 3 && <Card><h1 className="text-2xl font-bold">{t('Create your learner card')}</h1>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-soft p-3"><b>{t('On your card')}</b><ul className="mt-1 list-disc ps-5 text-sm"><li>{t('Your name and learner reference')}</li><li>{t('Your university and enrollment')}</li><li>{t('Achievements issued to you later')}</li></ul></div>
        <div className="rounded-xl border border-line p-3"><b>{t('Never on your card')}</b><ul className="mt-1 list-disc ps-5 text-sm"><li>{t('Accessibility preferences')}</li><li>{t('Support documents')}</li><li>{t('Drafts and applications')}</li></ul></div></div>
      <Err m={m} /><Row><UAEButton loading={busy} onClick={create}>{busy ? t('Generating your card…') : t('Create my card')}</UAEButton></Row></Card>}
  </section>
}

export const Saqr = ({ className = '' }: { className?: string }) => <svg viewBox="0 0 200 180" aria-hidden className={className}><ellipse cx="100" cy="110" rx="62" ry="58" fill="var(--primary)" /><ellipse cx="100" cy="125" rx="38" ry="40" fill="#f3ead3" /><path d="M40 90Q10 60 24 30Q56 52 62 84ZM160 90Q190 60 176 30Q144 52 138 84Z" fill="#5b4517" /><circle cx="78" cy="78" r="13" fill="#fff" /><circle cx="122" cy="78" r="13" fill="#fff" /><circle cx="80" cy="79" r="6" fill="#1d1a14" /><circle cx="120" cy="79" r="6" fill="#1d1a14" /><path d="M92 92H108L100 116Z" fill="#e0a82e" /></svg>

function LearnerCard({ data, h }: { data: Data; h: History | null }) {
  const t = useT(), enr = data.onb!.school, qual = curOf(data.records, 'qualification'), n = data.records.filter(r => ACH.includes(r.type) && r.status === 'active').length, [qrOk, setQrOk] = useState(true)
  const cur = h?.schools.find(s => s.current), prev = h?.schools.filter(s => !s.current).slice(-1)[0], lid = h?.learner.ref || (data.onb as any)?.learner?.ref
  const G = 'card-accent'
  return <div className="print-card guilloche relative flex flex-col justify-between gap-5 overflow-hidden rounded-[18px] bg-[#1f1a12] p-6 text-[#f4efe2] shadow-[0_22px_45px_-22px_rgba(31,26,18,.65)] ring-1 ring-white/10 sm:min-h-[310px]" aria-label={t('Tayseer learner card')} role="group">
    <div className="flex items-start justify-between gap-3"><div><p className={`eyebrow ${G}`}>{t('Tayseer learner card')}</p><p className="mt-0.5 text-[11px] text-[#c4b9a2]">{t('United Arab Emirates · demo')}</p></div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-current card-accent px-2.5 py-0.5 text-xs"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#6fd195]" />{t('Active')}</span></div>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0"><p className="display text-[2rem] sm:text-[2.3rem]">{t('Sara A.')}</p>
        <p className="mt-2 font-medium">{t(cur?.name ?? enr.issuer)}</p>
        {cur && <p className="text-sm text-[#d8cdb4]">{t(cur.emirate)} · {t(cur.curriculum)}</p>}
        <p className="text-sm text-[#d8cdb4]">{qual ? `${t('Qualification')}: ${t(qual.title)}` : cur ? t(cur.grades) : t(enr.title)} · {t('Enrolled')} · <span className="text-[#6fd195]">{t('Verified')}</span></p>
        {prev && <p className="mt-2 text-xs text-[#b5aa92]">{t('Previously')}: {prev.name} · {prev.authority}</p>}</div>
      <figure className="shrink-0 text-center">{qrOk ? <img src="/api/card/qr.svg" alt={t('Card verification QR (demo)')} onError={() => setQrOk(false)} className="h-[86px] w-[86px] rounded-lg bg-white p-1.5" />
        : <span className="grid h-[86px] w-[86px] place-items-center rounded-lg border border-dashed border-white/40 p-1 text-[10px] leading-tight text-[#d8cdb4]">{t('QR unavailable. Restart the server.')}</span>}
        <figcaption className="mt-1.5 text-[10px] text-[#c4b9a2]">{t('Status check (demo)')}</figcaption></figure></div>
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] border-t border-white/15 pt-3 text-sm">
      <div><dt className={`text-[10px] uppercase tracking-[.12em] ${G}`}>{t('Learner ID')}</dt><dd className="mono mt-0.5 whitespace-nowrap text-[0.9rem]">{lid || '—'}</dd></div>
      <div><dt className={`text-[10px] uppercase tracking-[.12em] ${G}`}>{t('Card no.')}</dt><dd className="mono mt-0.5">{data.onb!.onb.ref}</dd></div>
      <div className="sm:text-end"><dt className={`text-[10px] uppercase tracking-[.12em] ${G}`}>{t('Achievements')}</dt><dd className="mono mt-0.5">{n}</dd></div></dl>
  </div>
}

function CardHome({ data, go, seen }: P) {
  const t = useT(), [open, setOpen] = useState(false), h = useHistory(data.records.length), card = useRef<HTMLDivElement>(null), st = journey(data, seen ?? {}), next = st.find(s => !s.done && !s.wait), done = st.filter(s => s.done).length
  return <section className="enter">
    <PageHead title={t('My Card')} lead={t('One card that grows with you. You decide what anyone else sees.')} />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div><div ref={card}><LearnerCard data={data} h={h} /></div>
        <div className="mt-3 flex flex-wrap gap-2 no-print">
          <UAEButton variant="secondary" aria-expanded={open} aria-controls="card-details" onClick={() => setOpen(!open)}>{open ? t('Hide card details') : t('What’s inside my card?')}</UAEButton>
          <UAEButton onClick={() => go('share')}>{t('Share')}</UAEButton>
          <UAEButton variant="secondary" onClick={() => printEl(card.current)}>{t('Print card')}</UAEButton></div></div>
      <div className="flex flex-col gap-3">
        {next ? <Card className="border-primary"><p className="text-sm font-medium text-primary">{t('Your next step')}</p><h2 className="text-xl font-bold">{t(next.title)}</h2><p className="hint mt-1 text-sm">{t(next.why)}</p>
          <Row><UAEButton onClick={() => go(next.view)}>{t(next.cta)}</UAEButton></Row></Card>
          : <Card><h2 className="text-xl font-bold">{t('You are all caught up')}</h2><p className="text-sm text-muted">{t('New records appear here when an approved organization issues them.')}</p></Card>}
        <Disclosure title={<span className="flex flex-wrap items-center justify-between gap-2"><span>{t('Sara’s learning journey')}</span><span className="text-sm text-muted">{done} / {st.length}</span></span>}>
          <ol className="flex flex-col gap-1">{st.map((s, i) => <li key={s.k} className="flex items-start gap-3 py-1.5">
            <span aria-hidden className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${s.done ? 'bg-ok text-white' : s.wait ? 'border border-warn text-warn' : 'border border-line'}`}>{s.done ? '✓' : s.wait ? '…' : i + 1}</span>
            <span className="min-w-0 flex-1"><button className="text-start underline-offset-2 hover:underline cursor-pointer" onClick={() => go(s.view)}>{t(s.title)}</button>
              <span className="sr-only"> — {t(s.done ? 'Done' : s.wait ? 'Pending' : 'To do')}</span>{s.wait && <span className="block text-xs text-warn">{t(s.wait)}</span>}
              {s.k === 'grow' && (h?.transfers ?? []).length > 0 && <ul className="mt-1 space-y-0.5 text-sm">{h!.transfers.map((tr: any) => <li key={tr.id}><button className="text-start text-primary underline-offset-2 hover:underline cursor-pointer" onClick={() => go('learning', { tab: tr.type })}>{tr.title}</button> <span className="text-xs text-muted">· {t(tr.status === 'completed' ? 'Completed' : 'In progress')}</span></li>)}</ul>}</span></li>)}</ol>
        </Disclosure>
      </div>
    </div>
    {open && <CardDetails data={data} go={go} h={h} />}
  </section>
}

// "What's inside my card?" — organized, expandable, official vs not-official made explicit
function CardDetails({ data, go, h }: { data: Data; go: (v: View, o?: any) => void; h: History | null }) {
  const t = useT(), lang = useLang(), entries = useTimeline(data.records), enr = data.onb!.school, [doc, setDoc] = useState<Doc | null>(null), cur = h?.schools.find(x => x.current)
  const prevS = (h?.schools ?? []).filter(x => !x.current), kinds = (h?.docs ?? []).reduce((a: Record<string, number>, d) => (a[d.kind!] = (a[d.kind!] ?? 0) + 1, a), {})
  const curE = (entries ?? []).filter(e => e.current)
  const edu = curE.filter(e => e.category === 'academic'), ach = curE.filter(e => e.category === 'extracurricular')
  const Rec = ({ e }: { e: TEntry }) => <li className="py-1"><details className="rounded-xl border border-line">
    <summary className="flex min-h-11 flex-wrap items-center gap-2 px-3 py-2"><span aria-hidden className="chev text-primary">▸</span><span className={`min-w-0 flex-1 font-medium ${e.status === 'revoked' ? 'line-through text-muted' : ''}`}>{t(e.title)}</span><Status code={recStatus(e)} /></summary>
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1 border-t border-line px-3 py-3 text-sm sm:grid-cols-[max-content_1fr]">
      <dt className="text-muted">{t('Record title')}</dt><dd>{t(e.title)}</dd>
      <dt className="text-muted">{t('Issuing organization')}</dt><dd>{t(e.issuer)}</dd>
      <dt className="text-muted">{t('Record type')}</dt><dd>{t(TYPE[e.type] ?? e.type)} · {t('Official record')}</dd>
      <dt className="text-muted">{t(e.type === 'enrollment' ? 'Date of enrollment' : 'Date of achievement')}</dt><dd>{fmtDate(e.date, lang)}</dd>
      <dt className="text-muted">{t('Added to Tayseer')}</dt><dd>{fmtDate(e.issuedAt, lang)}</dd>
      <dt className="text-muted">{t('Verification')}</dt><dd>{t(e.verification.label)}</dd>
      <dt className="text-muted">{t('Current status')}</dt><dd><Status code={recStatus(e)} /></dd>
      <dt className="text-muted">{t('Previous versions')}</dt><dd>{e.history.length ? <ul className="list-disc ps-5">{e.history.map(h => <li key={h.id}>{t(h.title)} <Status code="replaced" /> <span className="text-muted">{fmtDate(h.issuedAt, lang)}</span></li>)}</ul> : t('None. This is the original version.')}</dd>
    </dl></details></li>
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <div className="rounded-2xl border border-line bg-card p-4"><h3 className="mb-2 text-lg font-bold">{t(title)}</h3>{children}</div>
  return <section id="card-details" aria-label={t('What’s inside my card?')} className="enter mt-6">
    <h2 className="text-2xl font-bold">{t('What’s inside my card?')}</h2>
    <p className="hint mb-3 text-muted">{t('Everything below is stored in your Tayseer profile. Official records come from the organization that issued them. You cannot edit them, but you can ask for a correction.')}</p>
    <div className="grid gap-3 md:grid-cols-2">
      <Section title="Identity"><dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm"><dt className="text-muted">{t('Learner name')}</dt><dd>{t('Sara A.')}</dd><dt className="text-muted">{t('Learner reference number')}</dt><dd className="font-mono">{h?.learner.ref ?? '—'} <span className="font-sans text-xs text-muted">({t('demo')})</span></dd><dt className="text-muted">{t('Card no.')}</dt><dd className="font-mono">{data.onb!.onb.ref}</dd><dt className="text-muted">{t('Account status')}</dt><dd><Status code="active" /></dd></dl></Section>
      <Section title="Current education"><dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm"><dt className="text-muted">{t('University or institution')}</dt><dd>{t(cur?.name ?? enr.issuer)}</dd>
        <dt className="text-muted">{t('Emirate and location')}</dt><dd>{cur ? `${cur.emirate}, UAE` : '—'}</dd><dt className="text-muted">{t('Curriculum')}</dt><dd>{cur ? t(cur.curriculum) : '—'}</dd>
        <dt className="text-muted">{t('Current year')}</dt><dd>{cur ? `${t(cur.grades)} (2026–27)` : t(enr.title)}</dd><dt className="text-muted">{t('Enrollment status')}</dt><dd><Status code="active" /></dd>
        <dt className="text-muted">{t('Qualification or level')}</dt><dd>{curOf(data.records, 'qualification') ? t(curOf(data.records, 'qualification').title) : t('Undergraduate, in progress')}</dd><dt className="text-muted">{t('Regulator')}</dt><dd>{cur?.authority ?? '—'}</dd></dl></Section>
    </div>
    <div className="mt-3 rounded-2xl border border-line bg-card p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-bold">{t('Previous Learning Records')}</h3><span className="text-sm text-muted">{prevS.length} {t('schools')} · {Object.values(kinds).reduce((a, b) => a + b, 0)} {t('documents')}</span></div>
      <p className="hint mb-2 text-sm text-muted">{t('Previous education stays on your profile after a transfer. Open a school to see its marksheets and supporting documents.')}</p>
      {h ? <PrevLearning h={h} onOpen={setDoc} onTransfer={() => go('learning', { tab: 'school' })} /> : <p role="status">{t('Loading…')}</p>}
      <h4 className="eyebrow mt-5 mb-1">{t('Academic documents')}</h4>
      <ul className="divide-y divide-line border-y border-line text-sm">{['marksheet', 'report', 'transcript', 'transfer_certificate', 'promotion_certificate', 'curriculum_approval', 'equivalency'].map(k => { const list = (h?.docs ?? []).filter(d => d.kind === k), d = list[list.length - 1]
        return <li key={k} className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 py-1.5"><span className="w-48 shrink-0 text-muted">{t(DOCLABEL[k])}</span><span className="min-w-0 flex-1 truncate">{d ? d.title : '—'}</span><span className="mono text-xs text-muted">{list.length || '—'}</span>
          {d && <UAEButton variant="tertiary" className="min-h-9 px-2" onClick={() => setDoc(d)}>{t('Show')}</UAEButton>}</li> })}</ul>
      <p className="mt-3 text-sm"><b>{t('Transfer history')}:</b> KHDA (Dubai, CBSE) → SPEA (Sharjah, American), 2022 · SPEA (Sharjah) → KHDA (Dubai, British), 2024 · {t('UAE national university → UK-based institution (in progress)')} · <button className="text-primary underline cursor-pointer" onClick={() => go('learning', { tab: 'school' })}>{t('View journey')}</button></p></div>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <Section title="Education records">{entries === null ? <p role="status">{t('Loading…')}</p> : edu.length ? <ul>{edu.map(e => <Rec key={e.id} e={e} />)}</ul> : <p className="text-sm text-muted">{t('No education records yet.')}</p>}</Section>
      <Section title="Achievements">{entries === null ? <p role="status">{t('Loading…')}</p> : ach.length ? <ul>{ach.map(e => <Rec key={e.id} e={e} />)}</ul>
        : <p className="text-sm text-muted">{t('Competition certificates, awards, participation, volunteering and training appear here when an approved organization issues them.')}</p>}</Section>
    </div>
    <div className="mt-3 rounded-2xl border border-dashed border-line p-4"><h3 className="text-lg font-bold">{t('Not official records')}</h3>
      <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        <li className="rounded-xl bg-soft p-3"><b>{t('Applications')}</b><br />{t('Your own submissions. Not shown on your card.')} <button className="underline cursor-pointer" onClick={() => go('apply')}>{t('Open')}</button></li>
        <li className="rounded-xl bg-soft p-3"><b>{t('Teacher observations')}</b><br />{t('Notes from teachers, not issued records.')} ({data.obs.length})</li>
        <li className="rounded-xl bg-soft p-3"><b>{t('Accessibility and support')}</b><br />{t('Kept separate and private. Never placed on your card.')} <button className="underline cursor-pointer" onClick={() => go('access')}>{t('Open')}</button></li>
      </ul></div>
    {doc && <DocViewer doc={doc} learner={h?.learner} close={() => setDoc(null)} />}
  </section>
}

// ---------------- My Learning ----------------
export function LearningView(p: P) {
  const { user, data, reload, intent } = p, t = useT(), [fix, setFix] = useState<TEntry | null>(null), corr = data.corrections ?? []
  const [tab, setTab] = useState<string>(intent?.tab ?? 'timeline'), [n, setN] = useState(0), h = useHistory(data.records.length + n * 1000), [doc, setDoc] = useState<Doc | null>(null)
  useEffect(() => { if (intent?.tab) setTab(intent.tab) }, [intent])
  const trS = h?.transfers.find(x => x.type === 'school'), trU = h?.transfers.find(x => x.type === 'university')
  const openDoc = (id: string) => { const d = h?.docs.find(x => x.id === id); if (d) setDoc(d); else { const r = data.records.find(x => x.id === id); r && setDoc({ ...r, kind: r.type } as Doc) } }
  const title = (id: string) => data.records.find(r => r.id === id)?.title ?? id
  const sara = user.role === 'sara'
  return <section className="enter">
    <PageHead title={t(sara ? 'My Learning' : 'Sara’s learning')} lead={t(sara ? 'Your lifelong learner profile: every record keeps its issuer, dates and status.' : 'Read-only. Sara can change or remove this permission at any time.')} />
    {corr.length > 0 && sara && <Card className="mb-4"><h2 className="text-lg font-bold">{t('Correction requests')}</h2><ul className="mt-1">{corr.map(c => <li key={c.id} className="flex flex-wrap items-center gap-2 border-b border-line py-2 last:border-0">
      <span className="min-w-0 flex-1">{t(title(c.recordId))} → <i>{c.fix}</i></span><Status code={c.status === 'pending' ? 'pending' : c.status === 'approved' ? 'accepted' : 'declined'} /></li>)}</ul>
      <p className="hint text-sm text-muted">{t('Only the issuing organization can change an official record. Approved corrections create a new version and keep the old one in its history.')}</p></Card>}
    {h && (h.schools.length > 0 || trS || trU) && <div role="tablist" aria-label={t('Learning views')} className="mb-4 flex flex-wrap gap-1 border-b border-line">{[['timeline', 'Timeline'], ['previous', 'Previous learning'], ...(trS ? [['school', 'School transfer']] : []), ...(trU ? [['university', 'University transfer']] : [])].map(([k, l]) =>
      <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px min-h-11 border-b-[3px] px-3 text-sm font-medium cursor-pointer ${tab === k ? 'border-primary text-fg' : 'border-transparent text-muted hover:text-fg'}`}>{t(l)}</button>)}</div>}
    {tab === 'previous' && h ? <div><h2 className="text-xl font-bold">{t('Current education')}</h2>
        {h.schools.filter(x => x.current).map(c => <dl key={c.id} className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 border-y border-line py-3 text-sm sm:grid-cols-[max-content_1fr]"><dt className="text-muted">{t('University or institution')}</dt><dd>{c.name}</dd><dt className="text-muted">{t('Emirate and location')}</dt><dd>{t(c.emirate)}, UAE · {c.authority}</dd><dt className="text-muted">{t('Curriculum')}</dt><dd>{t(c.curriculum)}</dd><dt className="text-muted">{t('Current year')}</dt><dd>{t(c.grades)} · {c.years}</dd></dl>)}
        <h2 className="mt-6 text-xl font-bold">{t('Previous Learning Records')}</h2><p className="hint mb-2 text-sm text-muted">{t('Previous education stays on your profile after a transfer. Open a school to see its marksheets and supporting documents.')}</p>
        <PrevLearning h={h} onOpen={setDoc} onTransfer={() => setTab('school')} />
        <h3 className="eyebrow mt-6 mb-1">{t('Other documents')}</h3><ul className="divide-y divide-line border-y border-line text-sm">{h.docs.filter(d => !d.school || d.school === 'UNI-1').map(d => <li key={d.id} className="flex min-h-11 flex-wrap items-center gap-x-3 py-1.5"><span className="min-w-0 flex-1">{d.title}<span className="block text-xs text-muted">{d.issuer} · {d.year}</span></span><Status code="verified" /><UAEButton variant="tertiary" className="min-h-9 px-2" onClick={() => setDoc(d)}>{t('Show')}</UAEButton></li>)}</ul></div>
      : tab === 'school' && trS ? <SchoolTransfer tr={trS} docs={h!.docs} onOpen={setDoc} />
      : tab === 'university' && trU ? <UniTransfer tr={trU} docs={h!.docs} onOpen={setDoc} reload={() => setN(x => x + 1)} />
      : <TimelineView {...p} onCorrect={sara ? (e: TEntry) => setFix(e) : undefined} onOpenDoc={openDoc} onOpenTransfer={(id: string) => setTab(id === 'TR-SCH-2024' ? 'school' : 'university')} />}
    {doc && <DocViewer doc={doc} learner={h?.learner} close={() => setDoc(null)} />}
    <Disclosure className="mt-6" title={<>{t('Teacher observations')} <span className="text-sm text-muted">({data.obs.length}) · {t('not official records')}</span></>}>
      {data.obs.length ? <ul>{data.obs.map((o, i) => <li key={i} className="border-b border-line py-2 last:border-0">{o.text}<br /><small className="text-muted">{t(o.by)}, {o.date}</small></li>)}</ul> : <p className="text-sm text-muted">{t('No observations yet.')}</p>}
    </Disclosure>
    {fix && <CorrectionDialog e={fix} close={() => setFix(null)} done={reload} />}
  </section>
}

function CorrectionDialog({ e, close, done }: { e: TEntry; close: () => void; done: () => Promise<void> }) {
  const t = useT(), [why, setWhy] = useState(''), [fix, setFix] = useState(e.title), [m, setM] = useState(''), [ok, setOk] = useState(false), first = useRef<HTMLInputElement>(null)
  useEffect(() => { first.current?.focus(); const k = (x: KeyboardEvent) => x.key === 'Escape' && close(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, []) // eslint-disable-line
  const send = async () => { const r = await api('/corrections', { recordId: e.id, reason: why, fix }); if (r.ok) { setOk(true); await done() } else setM(t(r.error)) }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={x => x.target === x.currentTarget && close()}>
    <div role="dialog" aria-modal="true" aria-labelledby="cor-t" className="w-full max-w-md rounded-2xl border border-primary bg-card p-5">
      <h2 id="cor-t" className="text-lg font-bold">{t('Request a correction')}</h2>
      {ok ? <><p role="status" className="my-3">✓ {t('Sent to')} <b>{t(e.issuer)}</b>. {t('Only the issuer can change an official record. You will see the decision in My Learning.')}</p><UAEButton onClick={close}>{t('Close')}</UAEButton></>
        : <><p className="text-sm text-muted">{t(e.title)} · {t(e.issuer)}</p><p className="hint mt-2 text-sm">{t('You cannot edit official records yourself. Your request goes to the organization that issued this record.')}</p>
          <Field label={t('What is wrong?')}><input ref={first} className={inputCls} value={why} onChange={x => setWhy(x.target.value)} /></Field>
          <Field label={t('What should it say instead?')}><input className={inputCls} value={fix} onChange={x => setFix(x.target.value)} /></Field>
          <Err m={m} /><Row><UAEButton onClick={send}>{t('Send request')}</UAEButton><UAEButton variant="secondary" onClick={close}>{t('Cancel')}</UAEButton></Row></>}
    </div></div>
}

// ---------------- Opportunities ----------------
export function OppsView({ user, data, go }: P) {
  const t = useT(), lang = useLang(), [d, setD] = useState<any>(null), [txt, setTxt] = useState(''), [m, setM] = useState(''), sara = user.role === 'sara'
  const load = async () => { const r = await api('/suggestions'); if (r.ok) { setD(r); setTxt(r.interests.join(', ')); setM('') } else setM(t(r.error)) }
  useEffect(() => { load() }, [data.records.length]) // eslint-disable-line
  const save = async () => { const r = await api('/interests', { interests: txt.split(',') }); setM(r.ok ? '' : t(r.error)); load() }
  const dismiss = async (id: string) => { const r = await api('/suggestions/dismiss', { id }); setM(r.ok ? '' : t(r.error)); load() }
  const a = data.apply, started = !!(a.name || a.problem)
  const list = d ? [...d.suggestions].sort((x: any, y: any) => sara ? 0 : x.deadline.localeCompare(y.deadline)) : []
  return <section className="enter"><PageHead title={t(sara ? 'Opportunities' : 'Deadlines')} lead={t(sara ? 'Suggestions based on your learning history and interests. They are not eligibility decisions.' : 'Upcoming deadlines for opportunities suggested to Sara.')} />
    <Err m={m} />
    {d && <>{list.length === 0 && <Card>{t('No suggestions. Add an interest.')}</Card>}
      <ul className="grid gap-3 md:grid-cols-2">{list.map((o: any) => <li key={o.id}><Card className="h-full flex flex-col">
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-soft px-2.5 py-0.5 font-medium">{t(o.kind)}</span><span className="text-muted">{t('Deadline')}: {fmtDate(o.deadline, lang)}</span></div>
        <h2 className="mt-2 text-lg font-bold">{t(o.title)}</h2><p className="text-sm text-muted">{t(o.org)}</p>
        <div className="mt-2 rounded-xl bg-soft p-3 text-sm"><b>{t('Why am I seeing this?')}</b><ul className="mt-1 list-disc ps-5">{o.why.map((w: any, i: number) => <li key={i}>{w.kind === 'interest' ? <>{t('You listed the interest')} “{w.text}”</> : <>{t('Related to your record')}: {t(w.text)}</>}</li>)}</ul></div>
        <p className="mt-2 text-xs font-medium text-warn">{t('Eligibility not verified. This is a suggestion, not a decision.')}</p>
        {sara && <div className="mt-auto flex flex-wrap gap-2 pt-3">{o.apply ? <UAEButton onClick={() => go('apply')}>{a.submitted ? t('View my application') : started ? t('Continue application') : t('Apply')}</UAEButton> : <span className="text-xs text-muted self-center">{t('Applications for this opportunity are not connected in the prototype.')}</span>}
          <UAEButton variant="tertiary" onClick={() => dismiss(o.id)}>{t('Not interested')}</UAEButton></div>}
      </Card></li>)}</ul>
      {sara && <Disclosure className="mt-4" title={t('Your interests')}><Field label={t('Your interests (separated by commas)')} helper={t('Suggestions use simple matching rules, not a live AI model.')}><input className={inputCls} value={txt} onChange={e => setTxt(e.target.value)} /></Field><UAEButton variant="secondary" onClick={save}>{t('Save interests')}</UAEButton></Disclosure>}
    </>}</section>
}

// ---------------- Applications ----------------
export function ApplyView({ user, data, reload, go }: P) {
  const t = useT(), a = data.apply, sara = user.role === 'sara', [name, setName] = useState(a.name), [prob, setProb] = useState(a.problem), [sf, setSf] = useState(false), [m, setM] = useState(''), [review, setReview] = useState(false)
  useEffect(() => { setName(a.name); setProb(a.problem) }, [a.name, a.problem])
  const enr = curOf(data.records, 'enrollment'), editable = !a.submitted || a.status === 'more information requested'
  const send = async (submit: boolean) => { const r = await api('/apply', { name, problem: prob, stepfree: sf, submit }); setM(r.ok ? (submit ? '' : t(sara ? 'Draft saved' : 'Draft saved for Sara to review')) : t(r.error)); if (r.ok) setReview(false); await reload() }
  const helped = a.helpedBy === 'parent' || a.draftBy === 'parent'
  const head = <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-xl font-bold">{t('Sustainability Challenge 2026')}</h2><p className="text-sm text-muted">{t('Sustainability Competition B')} · {t('Deadline')}: 1 Mar 2027{a.ref ? ` · ${t('Reference')}: ${a.ref}` : ''}{a.submittedAt ? ` · ${t('Submitted')} ${a.submittedAt}` : ''}</p></div><Status code={applyStatus(a)} /></div>
  if (a.redacted) return <section className="enter"><PageHead title={t('Application draft')} /><Card>{head}<p className="mt-3 text-sm">{t('Sara has not given you permission to help with the draft. You can see the deadline and status only.')}</p></Card></section>
  const reused = <div className="rounded-xl bg-soft p-3 text-sm"><b>{t('Reused from the learner profile')}</b>
    <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1"><dt className="text-muted">{t('Name')}</dt><dd>{t('Sara A.')}</dd>
      <dt className="text-muted">{t('University or institution')}</dt><dd>{enr ? t(enr.issuer) : '—'}</dd><dt className="text-muted">{t('Current enrollment')}</dt><dd>{enr ? <>{t(enr.title)} <Status code="verified" /></> : '—'}</dd></dl>
    <p className="hint mt-1 text-muted">{t('Only these details are sent with this application. Nothing else from your profile.')}</p></div>
  return <section className="enter"><PageHead title={t(sara ? 'Applications' : 'Application draft')} lead={t(sara ? 'Your applications. Drafts stay private until you submit them.' : 'You can prepare a draft. Sara reviews and submits it herself.')} />
    <Card>{head}
      {helped && <Note>{a.submitted ? t('Draft prepared with help from Sara’s parent supporter. Reviewed and submitted by Sara.') : t('Draft prepared with help from Sara’s parent supporter. Review it, then submit it yourself.')}</Note>}
      <div className="mt-3">{reused}</div>
      {!editable ? <div className="mt-4"><h3 className="font-bold">{t('Your project')}</h3><p className="mt-1"><b>{a.name}</b></p><p className="whitespace-pre-wrap text-sm">{a.problem}</p>
        <p className="mt-3 text-sm">{a.by === 'sara' ? t('Submitted by Sara.') : t('Sara’s parent submitted this application on her behalf.')} {t('Submitted applications are locked unless the organizer asks for more information.')}</p>
        {sara && <Row><UAEButton variant="secondary" onClick={() => go('learning')}>{t('See my learning')}</UAEButton></Row>}</div>
        : review ? <div className="mt-4"><h3 className="font-bold">{t('Review before you submit')}</h3>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]"><dt className="text-muted">{t('Recipient')}</dt><dd>{t('Sustainability Competition B')}</dd><dt className="text-muted">{t('Project title')}</dt><dd>{name}</dd><dt className="text-muted">{t('Project description')}</dt><dd className="whitespace-pre-wrap">{prob}</dd>
            <dt className="text-muted">{t('From your profile')}</dt><dd>{t('Name')}, {t('University or institution')}, {t('Current enrollment')}</dd>{sf && <><dt className="text-muted">{t('Support request')}</dt><dd>{t('Step-free venue access (support staff only)')}</dd></>}</dl>
          <Err m={m} /><Row><UAEButton onClick={() => send(true)}>{t('Submit application')}</UAEButton><UAEButton variant="secondary" onClick={() => setReview(false)}>{t('Back to edit')}</UAEButton></Row></div>
        : <div className="mt-2">
          <Field label={t('Project title')}><input className={inputCls} value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label={t('Project description')} helper={t('What problem does it solve, and how?')}><textarea rows={4} className={inputCls} value={prob} onChange={e => setProb(e.target.value)} /></Field>
          {sara && <label className="my-3 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--primary)]" checked={sf} onChange={e => setSf(e.target.checked)} /> {t('Ask for step-free venue access (goes only to support staff, not judges)')}</label>}
          <Err m={m} /><Row><UAEButton variant="secondary" onClick={() => send(false)}>{t(sara ? 'Save draft' : 'Save draft for Sara')}</UAEButton>
            {sara ? <UAEButton disabled={!name.trim() || !prob.trim()} onClick={() => { setM(''); setReview(true) }}>{t('Review and submit')}</UAEButton> : <span className="self-center text-sm text-muted">{t('Only Sara can submit.')}</span>}</Row></div>}
    </Card>
    {sara && <p className="hint mt-3 text-sm text-muted">{t('Looking for more?')} <button className="underline cursor-pointer" onClick={() => go('opps')}>{t('See opportunities')}</button></p>}
  </section>
}

// ---------------- Support & Access ----------------
export function AccessView({ user, data, reload, openA11y }: P) {
  const t = useT(), lang = useLang(), [m, setM] = useState(''), [opt, setOpt] = useState<{ perms?: any; adv?: any }>({})
  // optimistic overlay so checkboxes respond instantly; the server's answer (reload) is always the source of truth
  const s0 = data.access?.supporter, a0 = data.access?.advisor
  const s = s0 && { ...s0, perms: { ...s0.perms, ...(opt.perms || {}) } }, adv = a0 && { ...a0, ...(opt.adv || {}) }
  const post = async (path: string, b: any) => {
    if (b.perms) setOpt(o => ({ ...o, perms: { ...o.perms, ...b.perms } })); if (path.endsWith('advisor')) setOpt(o => ({ ...o, adv: { ...o.adv, ...b } }))
    const r = await api(path, b); setM(r.ok ? '' : t(r.error)); await reload(); setOpt({}) }
  const Check = ({ id, label, on, set, dis }: { id: string; label: string; on: boolean; set?: (v: boolean) => void; dis?: boolean }) =>
    <label htmlFor={id} className="my-1 flex min-h-11 items-start gap-3"><input id={id} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" checked={on} disabled={dis} onChange={e => set && set(e.target.checked)} /><span>{t(label)}{dis && <span className="text-muted"> ({t('never allowed')})</span>}</span></label>
  const PERMS: ['records' | 'deadlines' | 'draft', string][] =[['deadlines', 'See application deadlines'], ['draft', 'Help prepare a competition application (draft only)'], ['records', 'See my learning records (read-only)']]
  if (user.role === 'parent') return <section className="enter"><PageHead title={t('My permissions')} lead={t('Sara decides what you can do. She can change or revoke this at any time.')} />
    {s && <Card><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{t('Authorized Supporter for Sara')}</h2><Status code={linkStatus(s.status)} /></div>
      {s.status === 'pending' && <Note tone="warn">{t('Your relationship to Sara is being checked by Tayseer governance (simulated). Until then you have no access.')}</Note>}
      {s.status === 'revoked' && <Note tone="warn">{t('Sara has revoked your supporter access.')}</Note>}
      <ul className="mt-3">{PERMS.map(([k, l]) => <li key={k} className="flex items-start gap-2 py-1"><span aria-hidden>{s.perms[k] ? '✓' : '✕'}</span><span>{t(l)} <span className="sr-only">{t(s.perms[k] ? 'allowed' : 'not allowed')}</span></span></li>)}
        {['See private support documents', 'Share Sara’s records', 'Submit applications for Sara'].map(l => <li key={l} className="flex items-start gap-2 py-1 text-muted"><span aria-hidden>✕</span><span>{t(l)} ({t('never allowed')})</span></li>)}</ul>
      <p className="hint mt-2 text-sm text-muted">{t('Review date')}: {fmtDate(s.reviewAt, lang)}</p></Card>}</section>
  return <section className="enter"><PageHead title={t('Support & Access')} lead={t('You decide who can help you and what they can see.')} /><Err m={m} />
    <div className="grid gap-4 lg:grid-cols-2">
      {s && <Card><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{t('Parent/Guardian Supporter')}</h2><Status code={linkStatus(s.status)} /></div>
        <p className="hint mt-1 text-sm text-muted">{t('Your supporter signs in with their own account, never your password. The relationship to you is checked by Tayseer governance (simulated).')}</p>
        {s.status === 'pending' && <Note tone="warn">{t('Invitation sent. Waiting for the relationship check (simulated).')}</Note>}
        <fieldset className="mt-3 rounded-xl border border-line p-3" disabled={s.status === 'revoked'}><legend className="px-1 text-sm font-medium">{t('What your supporter can do')}</legend>
          {PERMS.map(([k, l]) => <Check key={k} id={'perm-' + k} label={l} on={s.perms[k]} set={v => post('/access/supporter', { perms: { [k]: v } })} />)}
          <Check id="perm-sup" label="See private support documents" on={false} dis /><Check id="perm-share" label="Share records on my behalf" on={false} dis /><Check id="perm-submit" label="Submit applications for me" on={false} dis /></fieldset>
        <Row>{s.status === 'revoked' || s.status === 'rejected' || s.status === 'expired' ? <UAEButton onClick={() => post('/access/supporter', { action: 'invite' })}>{t('Invite again')}</UAEButton>
          : <UAEButton variant="destructive" onClick={() => post('/access/supporter', { action: 'revoke' })}>{t('Revoke access')}</UAEButton>}</Row>
        <p className="hint text-xs text-muted">{t('Review date')}: {fmtDate(s.reviewAt, lang)}</p></Card>}
      {adv && <Card><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{t('Academic advisor')}</h2><Status code={adv.on ? 'active' : 'off'} /></div>
        <Check id="adv-on" label="Allow my academic advisor to see relevant records" on={adv.on} set={v => post('/access/advisor', { on: v })} />
        <fieldset className="ms-8 rounded-xl border border-line p-3" disabled={!adv.on}><legend className="px-1 text-sm font-medium">{t('Which records')}</legend>
          <Check id="adv-ac" label="Academic records (enrollment, results, qualifications)" on={adv.scope.includes('academic')} set={v => post('/access/advisor', { on: true, scope: v ? [...adv.scope, 'academic'] : adv.scope.filter(x => x !== 'academic') })} />
          <Check id="adv-ex" label="Achievements (awards, participation, training)" on={adv.scope.includes('extracurricular')} set={v => post('/access/advisor', { on: true, scope: v ? [...adv.scope, 'extracurricular'] : adv.scope.filter(x => x !== 'extracurricular') })} /></fieldset>
        <Note>{t('Your advisor never sees your applications or support documents.')}</Note></Card>}
      <Card><h2 className="text-xl font-bold">{t('Support arrangements')} <span className="text-sm font-normal text-muted">· {t('private')}</span></h2>
        <p className="hint mt-1 text-sm text-muted">{t('Never on your card. Only the learning-support coordinator approves them. Teachers see approved arrangements only. Your supporter and advisor never see them.')}</p>
        {data.support.length ? <ul className="mt-2">{data.support.map(x => <li key={x.id} className="flex flex-wrap items-center gap-2 border-b border-line py-2 last:border-0"><span className="min-w-0 flex-1">{t(x.text)}</span><Status code={x.status === 'approved' ? 'active' : 'pending'} /></li>)}</ul> : <p className="mt-2 text-sm">{t('No support arrangements yet.')}</p>}
        <Row><UAEButton variant="secondary" onClick={async () => { const r = await api('/interpreter', {}); setM(r.ok ? '' : t(r.error)); reload() }}>{t('Request a sign language interpreter')}</UAEButton></Row></Card>
      <Card><h2 className="text-xl font-bold">{t('Accessibility preferences')}</h2><p className="mt-1 text-sm">{t('Dark mode, colours, contrast, text size, cursor, sign language, reduced motion and simple mode.')}</p>
        <p className="hint mt-1 text-sm text-muted">{t('Saved on this device only. They are not learner records and never appear on your card.')}</p>
        <Row><UAEButton onClick={openA11y}><span aria-hidden>♿</span> {t('Open accessibility settings')}</UAEButton></Row></Card>
    </div>
    <Disclosure className="mt-4" title={t('Who sees what')}><UAEDataTable columns={[{ key: 'a', header: t('Who') }, { key: 'b', header: t('Can see') }, { key: 'c', header: t('Never sees') }]} rows={[
      ['Parent/Guardian Supporter', 'What you allow above', 'Support documents; cannot share or submit'], ['Academic advisor', 'The kinds of records you allow', 'Applications, support documents'],
      ['Teacher', 'Learning records, approved support', 'Pending support requests, applications'], ['Learning-support coordinator', 'Support requests', 'Your applications'], ['Reviewers', 'Only records you share, until expiry', 'Everything else']].map(x => ({ a: t(x[0]), b: t(x[1]), c: t(x[2]) }))} /></Disclosure>
  </section>
}

// ---------------- Parent/Guardian Supporter: overview of what Sara allows ----------------
export function ParentOverview({ data, go }: P) {
  const t = useT(), lang = useLang(), s = data.access?.supporter, p = s?.perms, on = s?.status === 'approved'
  const h = useHistory(on && p?.records ? 'ok' + data.records.length : 'locked'), [sug, setSug] = useState<any[] | null>(null)
  useEffect(() => { if (on && p?.deadlines) api('/suggestions').then(r => setSug(r.ok ? r.suggestions : [])) }, [on, p?.deadlines])
  if (!s) return <p role="status">{t('Loading…')}</p>
  const cur = h?.schools.find(x => x.current), prev = (h?.schools ?? []).filter(x => !x.current), recs = [...data.records].filter(r => r.status !== 'superseded').reverse().slice(0, 4)
  const lid = h?.learner.ref || (data.onb as any)?.learner?.ref, a = data.apply
  const Locked = ({ what }: { what: string }) => <p className="text-sm text-muted">{t('Not shared with you.')} {t(what)}</p>
  const Sec = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => <section className="border-t border-line pt-4"><div className="mb-2 flex items-baseline justify-between gap-2"><h2 className="eyebrow">{t(title)}</h2>{action}</div>{children}</section>
  return <section className="enter"><PageHead eyebrow={t('Authorized Supporter')} title={t('Sara at a glance')} lead={t('You see only what Sara allows. She can change or revoke this at any time.')}><Status code={linkStatus(s.status)} /></PageHead>
    {!on && <Note tone="warn">{s.status === 'revoked' ? t('Sara has revoked your supporter access.') : t('Your relationship to Sara is being checked by Tayseer governance (simulated). Until then you have no access.')}</Note>}
    <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
      <Sec title="Sara’s profile">{on && p?.records ? <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted">{t('Learner name')}</dt><dd className="font-medium">{t('Sara A.')}</dd><dt className="text-muted">{t('Learner ID')}</dt><dd className="mono">{lid ?? '—'}</dd>
        <dt className="text-muted">{t('University or institution')}</dt><dd>{cur?.name ?? '—'}</dd><dt className="text-muted">{t('Curriculum')}</dt><dd>{cur ? t(cur.curriculum) : '—'}</dd>
        <dt className="text-muted">{t('Current year')}</dt><dd>{cur ? t(cur.grades) : '—'}</dd><dt className="text-muted">{t('Previous schools')}</dt><dd>{prev.map(x => x.name).join(' · ') || '—'}</dd></dl>
        : <Locked what="Sara has turned off access to her learning records." />}</Sec>
      <Sec title="What Sara allows you to do" action={<button className="text-sm text-primary underline cursor-pointer" onClick={() => go('access')}>{t('Details')}</button>}>
        <ul className="space-y-1 text-sm">{([['records', 'See my learning records (read-only)'], ['deadlines', 'See application deadlines'], ['draft', 'Help prepare a competition application (draft only)']] as const).map(([k, l]) => <li key={k} className="flex gap-2"><span aria-hidden className={p?.[k] && on ? 'text-ok' : 'text-muted'}>{p?.[k] && on ? '✓' : '—'}</span><span className={p?.[k] && on ? '' : 'text-muted line-through'}>{t(l)}</span></li>)}
          <li className="flex gap-2 text-muted"><span aria-hidden>—</span><span>{t('Private support documents, sharing and submitting are never allowed.')}</span></li></ul></Sec>
      <Sec title="Upcoming deadlines" action={on && p?.deadlines ? <button className="text-sm text-primary underline cursor-pointer" onClick={() => go('opps')}>{t('All deadlines')}</button> : undefined}>
        {on && p?.deadlines ? sug === null ? <p role="status">{t('Loading…')}</p> : <ul className="divide-y divide-line text-sm">{[...sug].sort((x, y) => x.deadline.localeCompare(y.deadline)).slice(0, 4).map(o => <li key={o.id} className="flex items-baseline justify-between gap-3 py-2"><span>{t(o.title)}<span className="block text-xs text-muted">{t(o.org)}</span></span><span className="mono whitespace-nowrap text-xs">{fmtDate(o.deadline, lang)}</span></li>)}</ul>
          : <Locked what="Sara has not shared deadlines with you." />}</Sec>
      <Sec title="Application draft" action={on && (p?.draft || p?.deadlines) ? <button className="text-sm text-primary underline cursor-pointer" onClick={() => go('apply')}>{t('Open application draft')}</button> : undefined}>
        {on && (p?.draft || p?.deadlines) ? <div className="text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{t('Sustainability Challenge 2026')}</b><Status code={applyStatus(a)} /></div>
          <p className="text-muted">{t('Sustainability Competition B')} · {t('Deadline')}: 1 Mar 2027</p>
          {p?.draft && !a.redacted ? <p className="mt-1">{a.name ? <>{t('Project title')}: {a.name}</> : t('No draft yet. You can start one for Sara to review.')}</p> : <p className="mt-1 text-muted">{t('You can see the deadline and status only.')}</p>}
          <p className="mt-1 text-xs text-muted">{t('Only Sara can submit.')}</p></div> : <Locked what="Sara has not asked for help with applications." />}</Sec>
      <Sec title="Recent records" action={on && p?.records ? <button className="text-sm text-primary underline cursor-pointer" onClick={() => go('learning')}>{t('Sara’s learning')}</button> : undefined}>
        {on && p?.records ? <ul className="divide-y divide-line text-sm">{recs.map(r => <li key={r.id} className="flex items-center justify-between gap-3 py-2"><span>{t(r.title)}<span className="block text-xs text-muted">{t(r.issuer)}</span></span><Status code={recStatus(r)} /></li>)}
          {(h?.docs ?? []).slice(-2).map(d => <li key={d.id} className="flex items-center justify-between gap-3 py-2"><span>{d.title}<span className="block text-xs text-muted">{d.issuer}</span></span><Status code="verified" /></li>)}</ul>
          : <Locked what="Sara has turned off access to her learning records." />}</Sec>
    </div></section>
}
