import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { useLang, useT } from './i18n'
import type { TEntry } from './types'
import { Row, Status, UAEButton, inputCls, recStatus, type StatusCode } from './ui'
import type { P } from './views'

const TYPE: Record<string, string> = { enrollment: 'Enrollment', academic: 'Academic result', award: 'Award', participation: 'Participation', training: 'Training', qualification: 'Qualification' }
const sortKey = (e: TEntry) => e.date + '|' + (e.issuedAt ?? '') + '|' + e.id
const EVTYPE: Record<string, string> = { education: 'Education', transfer: 'Transfer', curriculum: 'Curriculum change', document: 'Document', application: 'Application' }
const APPST: Record<string, StatusCode> = { submitted: 'submitted', resubmitted: 'submitted', 'under review': 'review', 'more information requested': 'info', accepted: 'accepted', declined: 'declined' }
// server "events" (previous schools, documents, transfers, applications) shown alongside issued records
const toEntry = (ev: any): TEntry => ({ id: ev.id, title: ev.title, type: ev.kind, category: ev.category, date: ev.date, issuedAt: null, issuer: ev.issuer, src: ev.ref || '', level: null, status: ev.status,
  verification: { code: ev.status === 'verified' ? 'verified' : 'pending', label: ev.kind === 'application' ? 'Application, not a credential' : ev.status === 'verified' ? 'Issued by an approved issuer' : 'In progress' }, current: true, replaces: null, replacedBy: null, history: [], context: null, related: [],
  event: { kind: ev.kind, detail: ev.detail, docId: ev.docId, transferId: ev.transferId, ref: ev.ref, log: ev.log } })

// Lifelong learner timeline (Tayseer v0.6.2), restyled with Tayseer's vertical gold rule and cards.
export function TimelineView({ user, data, go, onCorrect, onOpenDoc, onOpenTransfer }: P & { onCorrect?: (e: TEntry) => void; onOpenDoc?: (id: string) => void; onOpenTransfer?: (id: string) => void }) {
  const t = useT(), lang = useLang(), own = user.role === 'sara'
  const [entries, setEntries] = useState<TEntry[] | null>(null), [note, setNote] = useState(''), [err, setErr] = useState('')
  const [cat, setCat] = useState('all'), [year, setYear] = useState('all'), [issuer, setIssuer] = useState('all'), [q, setQ] = useState('')
  const [replaced, setReplaced] = useState(false), [order, setOrder] = useState<'new' | 'old'>('new'), [open, setOpen] = useState<Record<string, boolean>>({})

  useEffect(() => { let live = true; api('/timeline').then(r => { if (!live) return; if (r.ok) { setEntries([...r.entries, ...(r.events ?? []).map(toEntry)]); setNote(r.note); setErr('') } else { setEntries([]); setErr(r.error || '') } }); return () => { live = false } }, [data.records])

  const fmt = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const all = entries ?? []
  const base = useMemo(() => all.filter(e => replaced || e.current), [all, replaced])
  const years = useMemo(() => [...new Set(base.map(e => e.date.slice(0, 4)))].sort().reverse(), [base])
  const issuers = useMemo(() => [...new Set(base.map(e => e.issuer))].sort(), [base])
  const needle = q.trim().toLowerCase()
  const shown = useMemo(() => {
    const list = base.filter(e => (cat === 'all' || e.category === cat) && (year === 'all' || e.date.startsWith(year)) && (issuer === 'all' || e.issuer === issuer)
      && (!needle || [e.title, t(e.title), e.issuer, t(e.issuer), e.src, e.level ?? ''].some(x => x.toLowerCase().includes(needle))))
    return list.sort((a, b) => (order === 'new' ? sortKey(b).localeCompare(sortKey(a)) : sortKey(a).localeCompare(sortKey(b))))
  }, [base, cat, year, issuer, needle, order, lang]) // eslint-disable-line
  const count = (c: string) => base.filter(e => c === 'all' || e.category === c).length
  const filtered = cat !== 'all' || year !== 'all' || issuer !== 'all' || needle !== ''
  const clear = () => { setCat('all'); setYear('all'); setIssuer('all'); setQ('') }
  const groups: [string, TEntry[]][] = []; shown.forEach(e => { const y = e.date.slice(0, 4), g = groups[groups.length - 1]; g && g[0] === y ? g[1].push(e) : groups.push([y, [e]]) })
  const jump = (id: string) => { const e = all.find(x => x.id === id); clear(); if (e && !e.current) setReplaced(true); setOpen(o => ({ ...o, [id]: true })); setTimeout(() => document.getElementById('rec-' + id)?.scrollIntoView?.({ block: 'center' }), 50) }
  const linkCls = 'underline underline-offset-2 text-primary min-h-11 sm:min-h-0 cursor-pointer text-start'

  const empty = (title: string, body: string, action?: React.ReactNode) => <div className="rounded-2xl border border-line bg-card p-5"><h3 className="text-lg font-bold">{t(title)}</h3><p className="text-muted">{t(body)}</p>{action}</div>
  const catEmpty = cat === 'academic' ? ['No academic records yet', 'Enrollment and school results issued by the school appear here.'] : ['No extracurricular records yet', 'Competition results, awards and training from participating organisers appear here.']
  let body: React.ReactNode
  if (entries === null) body = <p role="status">{t('Loading your timeline…')}</p>
  else if (err) body = <div className="rounded-2xl border border-line bg-card p-5"><b>{t(err)}</b></div>
  else if (!base.length) body = empty('No records yet', 'Records appear here when a school, competition organizer or training provider issues them. Nothing needs to be typed in by hand.')
  else if (cat !== 'all' && !count(cat)) body = empty(catEmpty[0], catEmpty[1])
  else if (!shown.length) body = empty('No records match these filters', 'Try a different year or issuer, or clear the search.', <Row><UAEButton variant="secondary" onClick={clear}>{t('Clear filters')}</UAEButton></Row>)
  else body = <div>{groups.map(([y, list]) => <div key={y} className="mb-5"><h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{y}</h3>
    <ol className="border-s-[3px] border-primary">{list.map(e => { const v = e.verification, on = !!open[e.id], pid = 'det-' + e.id, ev = e.event, isApp = ev?.kind === 'application'
      const box = isApp ? 'border-dashed border-muted/60 bg-bg' : e.category === 'extracurricular' ? 'border-line bg-card border-s-4 border-s-primary' : 'border-line bg-card'
      return <li key={e.id} id={'rec-' + e.id} className="relative ps-4 sm:ps-5 pb-3">
        <span aria-hidden className={`absolute -start-[7px] top-5 h-3 w-3 rounded-full border-2 border-primary ${e.current && e.status === 'active' ? 'bg-primary' : 'bg-card'}`} />
        <div className={`rounded-2xl border ${box}`}>
          <button type="button" aria-expanded={on} aria-controls={pid} onClick={() => setOpen(o => ({ ...o, [e.id]: !o[e.id] }))} className="w-full min-h-11 text-start p-4 flex gap-3 items-start cursor-pointer rounded-2xl hover:bg-soft">
            <span className="min-w-0 flex-1 break-words"><span className="block text-xs text-muted">{fmt(e.date)} · {t(TYPE[e.type] ?? EVTYPE[e.type] ?? e.type)}{ev?.detail ? ' · ' + ev.detail : ''}</span>
              <span className={`block font-head font-bold text-lg ${e.status === 'revoked' || !e.current ? 'line-through text-muted' : ''}`}>{t(e.title)}</span>
              <span className="block text-sm">{t(e.issuer)}</span>
              <span className="flex flex-wrap items-center gap-2 mt-2"><Status code={isApp ? APPST[e.status] ?? 'submitted' : ev ? (e.status === 'verified' ? 'verified' : 'pending') : recStatus(e)} /><span className="text-xs text-muted">{t(v.label)}</span></span></span>
            <span aria-hidden className={`mt-1 shrink-0 text-primary transition-transform ${on ? 'rotate-90' : 'rtl:-scale-x-100'}`}>▸</span></button>
          {on && ev && <div id={pid} className="px-4 pb-4 border-t border-line pt-3 text-sm break-words">
            <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
              <dt className="text-muted">{t(isApp ? 'Organization' : 'Issuer')}</dt><dd>{t(e.issuer)}</dd>
              <dt className="text-muted">{t(isApp ? 'Submission date' : 'Date of record')}</dt><dd>{fmt(e.date)}</dd>
              {ev.ref && <><dt className="text-muted">{t('Reference ID')}</dt><dd className="font-mono">{ev.ref}</dd></>}
              {ev.detail && <><dt className="text-muted">{t('Details')}</dt><dd>{ev.detail}</dd></>}
              <dt className="text-muted">{t('Status')}</dt><dd>{t(e.status)}</dd></dl>
            {isApp && ev.log && ev.log.length > 0 && <div className="mt-3"><b>{t('Status updates')}</b><ul className="list-disc ps-6">{ev.log.map((l, i) => <li key={i}>{fmt(l.at)}: {t(l.status)}</li>)}</ul></div>}
            {isApp && <p className="hint mt-2 text-muted">{t('An application is not an academic credential. It is shown so you can follow its progress.')}</p>}
            <Row>{isApp && <UAEButton variant="secondary" onClick={() => go('apply')}>{t('View application')}</UAEButton>}
              {ev.docId && onOpenDoc && <UAEButton variant="secondary" onClick={() => onOpenDoc(ev.docId!)}>{t('View document')}</UAEButton>}
              {ev.transferId && onOpenTransfer && <UAEButton variant="secondary" onClick={() => onOpenTransfer(ev.transferId!)}>{t('Open transfer journey')}</UAEButton>}</Row>
          </div>}
          {on && !ev && <div id={pid} className="px-4 pb-4 border-t border-line pt-3 text-sm break-words">
            <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
              <dt className="text-muted">{t('Issuer')}</dt><dd>{t(e.issuer)}</dd>
              <dt className="text-muted">{t('Source ID')}</dt><dd>{e.src}</dd>
              <dt className="text-muted">{t('Record type')}</dt><dd>{t(TYPE[e.type] ?? e.type)} · {t(e.category === 'academic' ? 'Academic' : 'Extracurricular')}</dd>
              <dt className="text-muted">{t('Date of record')}</dt><dd>{fmt(e.date)}</dd>
              {e.issuedAt && <><dt className="text-muted">{t('Added to Tayseer')}</dt><dd>{fmt(e.issuedAt)}</dd></>}
              {e.level && <><dt className="text-muted">{t('Level')}</dt><dd>{e.level}</dd></>}
              <dt className="text-muted">{t('Verification')}</dt><dd>{t(v.label)}</dd>
              <dt className="text-muted">{t('Status')}</dt><dd>{t(e.status)}</dd>
            </dl>
            {note && <p className="hint text-muted mt-2">{t(note)}</p>}
            {e.context && <p className="mt-3"><b>{t('Happened while enrolled in')}</b> <button type="button" className={linkCls} onClick={() => jump(e.context!.id)}>{t(e.context.title)}</button> · {t(e.context.issuer)}</p>}
            {e.related.length > 0 && <div className="mt-3"><b>{t('Related records')}</b><ul className="list-disc ps-6">{e.related.map(r => <li key={r.id}><button type="button" className={linkCls} onClick={() => jump(r.id)}>{t(r.title)}</button></li>)}</ul></div>}
            {e.history.length > 0 && <div className="mt-3"><b>{t('Earlier versions')}</b><ul className="list-disc ps-6">{e.history.map(h => <li key={h.id}><button type="button" className={linkCls} onClick={() => jump(h.id)}>{t(h.title)}</button> <Status code="replaced" /></li>)}</ul></div>}
            {e.replacedBy && <p className="mt-3"><b>{t('Replaced by')}</b> <button type="button" className={linkCls} onClick={() => jump(e.replacedBy!)}>{e.replacedBy}</button></p>}
            <Row>{own && e.status === 'active' && <UAEButton variant="secondary" onClick={() => onCorrect ? onCorrect(e) : go('records')}>{t('Request a correction')}</UAEButton>}{onOpenDoc && <UAEButton variant="tertiary" onClick={() => onOpenDoc(e.id)}>{t('View document')}</UAEButton>}</Row>
          </div>}
        </div></li>})}</ol></div>)}</div>

  return <section className="enter"><h2 className="text-xl font-bold mb-1">{t('Learning timeline')}</h2><p className="hint text-muted mb-4">{t('Every record keeps its issuer, status, and a route to ask for a fix.')}</p>
    {entries !== null && !err && base.length > 0 && <div role="search" aria-label={t('Filter the timeline')} className="flex flex-col gap-3 mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t('Category')} className="flex flex-wrap gap-2">{(['all', 'academic', 'extracurricular', ...(count('application') ? ['application'] : [])] as string[]).map(c =>
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={`min-h-11 px-4 rounded-full border text-sm font-medium cursor-pointer ${cat === c ? 'bg-primary text-primary-fg border-primary' : 'border-line bg-card hover:bg-soft'}`}>{t(c === 'all' ? 'All' : c === 'academic' ? 'Academic' : c === 'application' ? 'Applications' : 'Extracurricular')} ({count(c)})</button>)}</div>
        <label className="flex min-w-[12rem] flex-1 flex-col text-sm"><span className="sr-only sm:not-sr-only">{t('Search records')}</span><input className={inputCls} type="search" placeholder={t('Search records')} value={q} onChange={e => setQ(e.target.value)} /></label></div>
      <details className="rounded-2xl border border-line bg-card"><summary className="flex min-h-11 items-center gap-2 px-4 text-sm font-medium"><span aria-hidden className="chev inline-block text-primary">▸</span>{t('More filters')}</summary>
        <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-3">
          <label className="flex flex-col text-sm">{t('Year')}<select className={inputCls} value={year} onChange={e => setYear(e.target.value)}><option value="all">{t('All years')}</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
          <label className="flex flex-col text-sm">{t('Issuer')}<select className={inputCls} value={issuer} onChange={e => setIssuer(e.target.value)}><option value="all">{t('All issuers')}</option>{issuers.map(i => <option key={i} value={i}>{t(i)}</option>)}</select></label>
          <label className="flex flex-col text-sm">{t('Sort')}<select className={inputCls} value={order} onChange={e => setOrder(e.target.value as 'new' | 'old')}><option value="new">{t('Newest first')}</option><option value="old">{t('Oldest first')}</option></select></label>
          <label className="flex gap-2 items-center min-h-11 text-sm sm:col-span-3"><input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={replaced} onChange={e => setReplaced(e.target.checked)} /> {t('Show replaced versions')}</label></div></details>
      <div className="flex flex-wrap gap-3 items-center">{filtered && <UAEButton variant="secondary" onClick={clear}>{t('Clear filters')}</UAEButton>}
        <span aria-live="polite" className="text-sm text-muted">{t('Showing')} {shown.length} {t('of')} {base.length} {t('records')}</span></div></div>}
    {entries !== null && all.some(x => x.event) && <p aria-hidden className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"><span><span className="me-1 inline-block h-3 w-4 rounded border border-line bg-card align-middle" />{t('Official education record')}</span><span><span className="me-1 inline-block h-3 w-4 rounded border border-line border-s-4 border-s-primary bg-card align-middle" />{t('Achievement')}</span><span><span className="me-1 inline-block h-3 w-4 rounded border border-dashed border-muted align-middle" />{t('Application (not a credential)')}</span></p>}
    {body}</section>
}
