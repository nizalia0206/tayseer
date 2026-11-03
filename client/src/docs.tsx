import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { useLang, useT } from './i18n'
import { Disclosure, Err, Note, Status, UAEButton, fmtDate, type StatusCode } from './ui'

export interface Doc { id: string; kind?: string; title: string; issuer: string; authority?: string; curriculum?: string; grade?: string; year?: string; date?: string; issuedAt?: string; status: string; category?: string; subjects?: { subject: string; original: string; scale: string; normalized: number | null; credit: number | null }[]; summary?: string; notes?: string; validate?: boolean; school?: string | null; type?: string; level?: string }
export interface School { id: string; name: string; emirate: string; authority: string; curriculum: string; grades: string; years: string; exit: string; kind: string; current?: boolean }
export interface History { learner: { name: string; ref: string }; schools: School[]; docs: Doc[]; transfers: any[] }
export const DOCLABEL: Record<string, string> = { marksheet: 'Marksheet', report: 'Term report', transcript: 'Transcript', transfer_certificate: 'Transfer certificate', curriculum_approval: 'Curriculum-change approval', enrollment_confirmation: 'Enrollment confirmation', promotion_certificate: 'Promotion certificate', volunteering: 'Volunteering record',
  enrollment: 'Enrollment', academic: 'Academic result', award: 'Competition achievement certificate', participation: 'Participation certificate', training: 'Training certificate', qualification: 'Qualification' }
export const useHistory = (dep?: unknown) => { const [h, setH] = useState<History | null>(null); useEffect(() => { let live = true; api('/history').then(r => live && setH(r.ok ? (r as any) : { learner: { name: '', ref: '' }, schools: [], docs: [], transfers: [] })); return () => { live = false } }, [dep]); return h }

// Print one element only: clone it into #print-root; print CSS hides everything else.
export function printEl(el: HTMLElement | null) {
  if (!el) return
  let root = document.getElementById('print-root'); if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root) }
  root.innerHTML = ''; root.appendChild(el.cloneNode(true)); document.body.classList.add('printing')
  const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done); window.print()
}

const TSTAT: Record<string, StatusCode> = { required: 'required', uploaded: 'uploaded', awaiting: 'awaiting', verified: 'verified', rejected: 'rejected', na: 'na', submitted: 'submitted', pending: 'pending', unverified: 'unverified', active: 'verified' }
export const docStatus = (s: string): StatusCode => TSTAT[s] ?? 'verified'

// Realistic demo document preview (never styled like a government certificate; always watermarked).
export function DocViewer({ doc, learner, close }: { doc: Doc; learner?: { name: string; ref: string }; close: () => void }) {
  const t = useT(), lang = useLang(), paper = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null)
  useEffect(() => { btn.current?.focus(); const k = (e: KeyboardEvent) => e.key === 'Escape' && close(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, []) // eslint-disable-line
  const label = DOCLABEL[doc.kind ?? doc.type ?? ''] ?? doc.type ?? ''
  const rows: [string, string | undefined][] = [['Student name', learner?.name || 'Sara A.'], ['Learner reference ID', learner?.ref || 'ULL-2026-0048213'], ['Document reference', doc.id], ['Issuer', doc.issuer], ['Authority', doc.authority], ['Academic year', doc.year], ['Curriculum', doc.curriculum], ['Grade', doc.grade || doc.level], ['Issuing date', fmtDate(doc.date || doc.issuedAt, lang)]]
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 p-3 sm:p-6" onClick={e => e.target === e.currentTarget && close()}>
    <div role="dialog" aria-modal="true" aria-label={doc.title} className="mx-auto max-w-3xl">
      <div className="mb-2 flex flex-wrap justify-end gap-2"><UAEButton variant="secondary" className="bg-card" onClick={() => printEl(paper.current)}>{t('Print document')}</UAEButton><UAEButton ref={btn as any} variant="secondary" className="bg-card" onClick={close}>{t('Close')}</UAEButton></div>
      <div ref={paper} className="doc-paper relative overflow-hidden rounded-lg border border-[#d8d2c4] bg-white p-6 text-[#1d1a14] shadow-xl sm:p-10" lang="en" dir="ltr">
        <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center select-none"><span className="-rotate-[30deg] text-[5.5rem] font-extrabold tracking-widest text-[#a12626] opacity-[0.07]">DEMO</span></span>
        <p className="mb-6 border border-dashed border-[#a12626] px-3 py-1.5 text-center text-xs font-bold tracking-wide text-[#a12626]">DEMO — NOT AN OFFICIAL DOCUMENT · fictional data for a prototype</p>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e4dcc8] pb-4"><div><p className="text-sm font-semibold">{doc.issuer}</p>{doc.authority && <p className="text-xs text-[#5f5747]">{doc.authority}</p>}</div>
          <div className="text-end text-xs text-[#5f5747]"><p>{label}</p><p className="font-mono">{doc.id}</p></div></div>
        <h2 className="mt-5 text-xl font-bold">{doc.title}</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">{rows.filter(r => r[1] && r[1] !== '—').map(([k, v]) => <div key={k} className="flex gap-3 border-b border-[#f1ece0] py-1"><dt className="w-40 shrink-0 text-[#5f5747]">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
        {doc.subjects && doc.subjects.length > 0 && <table className="mt-6 w-full border-collapse text-sm"><thead><tr className="border-b-2 border-[#1d1a14] text-start"><th className="py-1.5 text-start">Subject / module</th><th className="py-1.5 text-start">Original mark / grade</th><th className="py-1.5 text-start">Scale</th>{doc.subjects.some(s => s.credit !== null) && <th className="py-1.5 text-end">Credit</th>}{doc.subjects.some(s => s.normalized !== null) && <th className="py-1.5 text-end">Normalized*</th>}</tr></thead>
          <tbody>{doc.subjects.map(s => <tr key={s.subject} className="border-b border-[#eee7d8]"><td className="py-1.5">{s.subject}</td><td className="py-1.5 font-medium">{s.original}</td><td className="py-1.5 text-[#5f5747]">{s.scale}</td>{doc.subjects!.some(x => x.credit !== null) && <td className="py-1.5 text-end">{s.credit ?? '—'}</td>}{doc.subjects!.some(x => x.normalized !== null) && <td className="py-1.5 text-end text-[#5f5747]">{s.normalized ?? '—'}</td>}</tr>)}</tbody></table>}
        {doc.summary && <p className="mt-3 text-sm font-medium">{doc.summary}</p>}
        {doc.notes && <p className="mt-3 text-sm">{doc.notes}</p>}
        <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-[#e4dcc8] pt-4 text-xs text-[#5f5747]">
          <div><p>Verification status: <b className="text-[#1d1a14]">{doc.status === 'verified' || doc.status === 'active' ? 'Verified (issuer approved on Tayseer, demo)' : doc.status}</b></p>
            {doc.subjects?.some(s => s.normalized !== null) && <p className="mt-1 max-w-md">* Normalized values are derived for comparison only. Original grades and scales are kept as issued. Crosswalk must come from the official MOE equivalency matrix. [VALIDATE]</p>}
            {doc.validate && <p className="mt-1 font-semibold">Procedure to be validated with the relevant authority (SPEA / KHDA / MOE). [VALIDATE]</p>}</div>
          <p className="font-mono">Tayseer demo · {doc.id}</p></div>
      </div></div></div>
}

// Previous Learning Records: one expandable row per school, with its documents
export function PrevLearning({ h, onOpen, onTransfer }: { h: History; onOpen: (d: Doc) => void; onTransfer?: (id: string) => void }) {
  const t = useT(), lang = useLang(), prev = h.schools.filter(s => !s.current)
  if (!prev.length) return <p className="text-sm text-muted">{t('No previous learning records.')}</p>
  return <ul className="divide-y divide-line rounded-xl border border-line">{prev.map(s => { const ds = h.docs.filter(d => d.school === s.id)
    return <li key={s.id}><details className="group">
      <summary className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5"><span aria-hidden className="chev text-primary">▸</span><span className="min-w-0 flex-1"><b className="block">{s.name}</b><span className="block text-xs text-muted">{s.emirate} · {s.authority} · {s.curriculum} · {s.grades} · {s.years}</span></span><span className="text-xs text-muted">{ds.length} {t('documents')}</span></summary>
      <div className="border-t border-line bg-soft/40 px-3 py-2">
        <p className="text-xs text-muted">{t('Exit status')}: {s.exit}</p>
        {ds.length ? <ul className="mt-1">{ds.map(d => <li key={d.id} className="flex flex-wrap items-center gap-2 py-1.5 text-sm"><span className="min-w-0 flex-1"><span className="block">{d.title}</span><span className="block text-xs text-muted">{t(DOCLABEL[d.kind ?? ''] ?? '')} · {d.year} · {fmtDate(d.date, lang)}</span></span><Status code={docStatus(d.status)} /><UAEButton variant="tertiary" className="min-h-9 px-2" onClick={() => onOpen(d)}>{t('View')}</UAEButton></li>)}</ul> : <p className="text-sm text-muted">{t('No documents.')}</p>}
        {onTransfer && s.id === 'SCH-2' && <p className="mt-1 text-sm"><button className="text-primary underline cursor-pointer" onClick={() => onTransfer('TR-SCH-2024')}>{t('Open the Sharjah to Dubai transfer journey')}</button></p>}
      </div></details></li> })}</ul>
}

const Item = ({ it, onOpen, docs, onUpload }: { it: any; onOpen: (d: Doc) => void; docs: Doc[]; onUpload?: (id: string) => void }) => {
  const t = useT(), d = it.doc && docs.find(x => x.id === it.doc)
  return <li className="py-1.5"><details><summary className="flex min-h-10 flex-wrap items-center gap-2 text-sm"><span aria-hidden className="chev text-primary">▸</span><span className="min-w-0 flex-1">{it.name}{it.validate && <span className="ms-2 text-xs text-warn">[{t('validate')}]</span>}</span><Status code={docStatus(it.status)} /></summary>
    <div className="ms-6 mt-1 text-sm"><p className="text-muted"><b className="text-fg">{t('What is it for?')}</b> {it.purpose}</p>
      <div className="mt-1 flex flex-wrap gap-2">{d && <UAEButton variant="tertiary" className="min-h-9 px-2" onClick={() => onOpen(d)}>{t('View document')}</UAEButton>}
        {onUpload && it.status === 'required' && <UAEButton variant="secondary" className="min-h-9" onClick={() => onUpload(it.id)}>{t('Upload document (demo)')}</UAEButton>}</div></div></details></li>
}
const LEGEND: StatusCode[] = ['required', 'uploaded', 'awaiting', 'verified', 'rejected', 'na']
export const Legend = () => <div className="flex flex-wrap gap-1.5">{LEGEND.map(c => <Status key={c} code={c} />)}</div>

export function SchoolTransfer({ tr, docs, onOpen }: { tr: any; docs: Doc[]; onOpen: (d: Doc) => void }) {
  const t = useT(), lang = useLang(), all = tr.stages.flatMap((s: any) => s.items), missing = all.filter((i: any) => i.status === 'required')
  return <section aria-labelledby="st-h">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 id="st-h" className="text-xl font-bold">{tr.title}</h2><p className="text-sm text-muted">{fmtDate(tr.started, lang)} – {fmtDate(tr.completed, lang)}</p></div><Status code={tr.status === 'completed' ? 'verified' : 'pending'} /></div>
    <div className="mt-3 grid gap-3 rounded-xl bg-soft p-3 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div><p className="text-xs text-muted">{t('From')}</p><b>{tr.from.school}</b><p>{tr.from.emirate} · {tr.from.authority}</p><p>{tr.from.curriculum} · {tr.from.grade}</p></div><span aria-hidden className="hidden text-2xl text-primary sm:block rtl:-scale-x-100">→</span>
      <div><p className="text-xs text-muted">{t('To')}</p><b>{tr.to.school}</b><p>{tr.to.emirate} · {tr.to.authority}</p><p>{tr.to.curriculum} · {tr.to.grade}</p></div></div>
    <p className="mt-2 text-sm">{tr.placement}</p>
    <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm"><span><b>{t('Missing documents')}:</b> {missing.length ? missing.map((m: any) => m.name).join(', ') : t('none')}</span><span><b>{t('Next action')}:</b> {missing.length ? t('Upload the missing documents') : `${t('Transfer completed on')} ${fmtDate(tr.completed, lang)}`}</span></div>
    <Note tone="warn">{t('Steps marked [validate] follow the sample transfer pack and must be confirmed with SPEA, KHDA or MOE. Tayseer does not set approval rules.')}</Note>
    <ol className="mt-4 border-s-[3px] border-primary">{tr.stages.map((s: any) => <li key={s.n} className="relative pb-4 ps-5">
      <span aria-hidden className="absolute -start-[13px] top-0 grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">{s.n}</span>
      <p className="font-medium">{s.title}{s.validate && <span className="ms-2 text-xs font-normal text-warn">[{t('validate')}]</span>}</p>
      <p className="text-xs text-muted">{fmtDate(s.date, lang)} · {s.owner}</p><p className="text-sm">{s.detail}</p>
      {s.items.length > 0 && <ul className="mt-1 divide-y divide-line rounded-xl border border-line bg-card px-3">{s.items.map((it: any) => <Item key={it.id} it={it} docs={docs} onOpen={onOpen} />)}</ul>}</li>)}</ol>
    <div className="mt-2"><p className="mb-1 text-xs text-muted">{t('Document statuses')}</p><Legend /></div>
  </section>
}

export function UniTransfer({ tr, docs, onOpen, reload }: { tr: any; docs: Doc[]; onOpen: (d: Doc) => void; reload: () => void }) {
  const t = useT(), lang = useLang(), [m, setM] = useState(''), items = tr.groups.flatMap((g: any) => g.items), missing = items.filter((i: any) => i.status === 'required')
  const upload = async (id: string) => { const r = await api(`/transfers/${tr.id}/items/${id}/upload`, {}); setM(r.ok ? '' : t(r.error)); reload() }
  const tx = docs.find(d => d.id === tr.credits.transcript)
  const RES: Record<string, StatusCode> = { accepted: 'accepted', not_accepted: 'notacc', pending: 'pending' }
  return <section aria-labelledby="ut-h">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 id="ut-h" className="text-xl font-bold">{tr.title}</h2><p className="text-sm text-muted">{t('Started')} {fmtDate(tr.started, lang)} · {t('illustrative scenario')}</p></div><Status code="pending" /></div>
    <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6" aria-label={t('Transfer progress')}>{tr.steps.map((s: any) => <li key={s.n} aria-current={s.status === 'active' ? 'step' : undefined} className={`border-t-4 pt-1 text-xs ${s.status === 'done' ? 'border-ok' : s.status === 'active' ? 'border-primary font-medium' : 'border-line text-muted'}`}>{s.n}. {s.title}</li>)}</ol>
    <div className="mt-4 grid gap-3 rounded-xl bg-soft p-3 text-sm sm:grid-cols-2">
      <div><p className="text-xs text-muted">{t('Previous university')}</p><b>{tr.from.school}</b><p>{tr.from.curriculum}</p><p>{tr.from.grade}</p></div>
      <div><p className="text-xs text-muted">{t('New university')}</p><b>{tr.to.school}</b><p>{tr.to.curriculum}</p><p>{tr.to.grade}</p></div>
      <div className="sm:col-span-2 flex flex-wrap gap-x-6 gap-y-1"><span><b>{t('Credits completed')}:</b> {tr.credits.completed} {tr.credits.unit}</span><span><b>GPA:</b> {tr.credits.gpa}</span><span><b>{t('Grading scale')}:</b> {tr.credits.scale}</span>{tx && <button className="text-primary underline cursor-pointer" onClick={() => onOpen(tx)}>{t('View transcript and modules')}</button>}</div></div>
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm"><span><b>{t('Missing documents')}:</b> {missing.length ? missing.map((x: any) => x.name).join(', ') : t('none')}</span><span><b>{t('Next action')}:</b> {missing.length ? `${t('Submit')}: ${missing[0].name}` : t('Wait for the receiving university’s assessment')}</span></div>
    <Err m={m} />
    <div className="mt-4 grid gap-4 lg:grid-cols-2">{tr.groups.map((g: any) => <div key={g.who}><h3 className="font-semibold">{t(g.title)}</h3><ul className="mt-1 divide-y divide-line rounded-xl border border-line bg-card px-3">{g.items.map((it: any) => <Item key={it.id} it={it} docs={docs} onOpen={onOpen} onUpload={g.who !== 'receiving' ? upload : undefined} />)}</ul></div>)}
      <div><h3 className="font-semibold">{t('Decisions only the receiving university can make')}</h3><ul className="mt-1 list-disc rounded-xl border border-line bg-card py-2 ps-8 pe-3 text-sm">{tr.decisions.map((d: string) => <li key={d} className="py-0.5">{d}</li>)}</ul></div></div>
    <Disclosure className="mt-4" open title={t('Credit transfer assessment (receiving university)')}>
      <table className="w-full text-sm"><thead><tr className="border-b border-line"><th className="py-1.5 text-start">{t('Module')}</th><th className="py-1.5 text-start">{t('Decision')}</th><th className="py-1.5 text-start">{t('Note')}</th></tr></thead>
        <tbody>{tr.assessment.map((a: any) => <tr key={a.module} className="border-b border-line align-top"><td className="py-1.5 pe-2">{a.module}</td><td className="py-1.5 pe-2"><Status code={RES[a.result]} /></td><td className="py-1.5 text-muted">{a.note}</td></tr>)}</tbody></table>
      <p className="mt-3 text-sm font-medium">{t('Outstanding requirements')}</p><ul className="list-disc ps-6 text-sm">{tr.outstanding.map((o: string) => <li key={o}>{o}</li>)}</ul>
      <Note tone="warn">{tr.note}</Note></Disclosure>
    <div className="mt-3"><p className="mb-1 text-xs text-muted">{t('Document statuses')}</p><Legend /></div>
  </section>
}
