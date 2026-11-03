import { useEffect, useRef, useState } from 'react'
import { api, tokenOf } from './api'
import { useLang, useT } from './i18n'
import type { Rec } from './types'
import type { P } from './views'
import { Card, Err, Field, Note, PageHead, Row, Status, UAEButton, fmtDate, inputCls, linkStatus, type StatusCode } from './ui'
import { DocViewer, printEl, type Doc } from './docs'

const TYPE: Record<string, string> = { enrollment: 'Enrollment', academic: 'Academic result', award: 'Award', participation: 'Participation', training: 'Training', qualification: 'Qualification' }
const STEPS = ['Recipient', 'Purpose', 'Documents', 'Review']
interface Item { id: string; title: string; issuer: string; date: string; status: string; type: string; kind: string }
interface Req { key: string; label: string; match: string[] }
interface Recip { org: string; kind: string; requirements: { required: Req[]; optional: Req[]; notRequested: string[] } | null }
const vstat = (s: string): StatusCode => s === 'verified' ? 'verified' : s === 'submitted' ? 'submitted' : 'unverified'

// One sharing destination. Requirements are shown first; Sara selects documents herself; nothing is pre-selected.
export function ShareView({ user, data, reload }: P) {
  const t = useT(), lang = useLang(), [opts, setOpts] = useState<{ recipients: Recip[]; purposes: string[]; days: number[]; items: Item[] } | null>(null)
  const [step, setStep] = useState(0), [org, setOrg] = useState(''), [purpose, setPurpose] = useState(''), [sel, setSel] = useState<string[]>([]), [days, setDays] = useState(7)
  const [res, setRes] = useState<{ token: string; ref: string; link: string; expires: string; created: string } | null>(null), [m, setM] = useState(''), [qr, setQr] = useState<string | null>(null), [copied, setCopied] = useState(false)
  const [tab, setTab] = useState('active'), head = useRef<HTMLHeadingElement>(null), report = useRef<HTMLDivElement>(null)
  useEffect(() => { if (user.role === 'sara') api('/share-options').then(r => r.ok ? setOpts(r as any) : setM(t(r.error))) }, [data.records.length, data.apply.submitted]) // eslint-disable-line
  useEffect(() => { head.current?.focus() }, [step, res])
  if (user.role !== 'sara') return <section className="enter"><PageHead title={t('Sharing')} /><Card>{t('Only Sara can share her records. Supporters cannot share on her behalf')}</Card></section>
  const items = opts?.items ?? [], byId = (id: string) => items.find(i => i.id === id), rcp = opts?.recipients.find(r => r.org === org), R = rcp?.requirements
  const toggle = (id: string, on: boolean) => setSel(s => on ? [...s, id] : s.filter(x => x !== id))
  const reset = () => { setStep(0); setOrg(''); setPurpose(''); setSel([]); setDays(7); setRes(null); setM(''); setCopied(false) }
  const confirm = async () => { const r = await api('/grants', { org, purpose, ids: sel, days }); if (r.ok) { setRes({ token: r.token, ref: r.ref, link: r.link, expires: r.expires, created: new Date().toISOString() }); setM(''); await reload() } else setM(t(r.error)) }
  const revoke = async (tok: string) => { const r = await api(`/grants/${tok}/revoke`, {}); setM(r.ok ? '' : t(r.error)); if (res?.token === tok) setRes(null); if (qr === tok) setQr(null); await reload() }
  const reqState = (q: Req, required: boolean) => !q.match.length ? 'na' : q.match.some(i => sel.includes(i)) ? (required ? 'ok' : 'opt-sel') : required ? 'missing' : 'opt'
  const STATE: Record<string, [string, StatusCode]> = { ok: ['Required and selected', 'verified'], missing: ['Required but not selected', 'required'], opt: ['Optional', 'off'], 'opt-sel': ['Optional, selected', 'active'], na: ['Not applicable: no matching record', 'na'] }
  const listed = new Set([...(R?.required ?? []), ...(R?.optional ?? [])].flatMap(q => q.match)), others = items.filter(i => !listed.has(i.id))
  const missingReq = (R?.required ?? []).filter(q => reqState(q, true) === 'missing'), excluded = items.filter(i => !sel.includes(i.id))
  const canNext = [!!org, !!purpose, sel.length > 0, true][step]
  const Line = ({ i }: { i: Item }) => <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 ${sel.includes(i.id) ? 'bg-soft' : 'hover:bg-soft/60'}`}>
    <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]" checked={sel.includes(i.id)} onChange={e => toggle(i.id, e.target.checked)} />
    <span className="min-w-0 flex-1"><span className="block font-medium">{t(i.title)}</span><span className="block text-xs text-muted">{t(i.issuer)} · {fmtDate(i.date, lang)} · {t(TYPE[i.type] ?? i.type)}</span></span><Status code={vstat(i.status)} /></label>
  const ReqBlock = ({ q, required }: { q: Req; required: boolean }) => { const st = reqState(q, required)
    return <li className="py-2"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">{t(q.label)}</b><span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${st === 'ok' || st === 'opt-sel' ? 'border-ok text-ok' : st === 'missing' ? 'border-warn text-warn' : 'border-line text-muted'}`}><span aria-hidden>{st === 'ok' || st === 'opt-sel' ? '✓ ' : st === 'missing' ? '! ' : ''}</span>{t(STATE[st][0])}</span></div>
      {q.match.length > 0 && <div className="mt-1">{q.match.map(id => byId(id)).filter(Boolean).map(i => <Line key={i!.id} i={i!} />)}</div>}</li> }
  const ReqPreview = ({ r }: { r: Recip }) => r.requirements ? <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
    <div><p className="font-semibold">{t('Required')}</p><ul className="list-disc ps-5">{r.requirements.required.map(q => <li key={q.key}>{t(q.label)}</li>)}</ul></div>
    <div><p className="font-semibold">{t('Optional')}</p><ul className="list-disc ps-5">{r.requirements.optional.map(q => <li key={q.key}>{t(q.label)}</li>)}</ul></div>
    <div><p className="font-semibold">{t('Not requested')}</p><ul className="list-disc ps-5 text-muted">{r.requirements.notRequested.map(q => <li key={q}>{t(q)}</li>)}</ul></div></div> : null
  const grants = [...(data.grants ?? [])].reverse() as any[], gl = { active: grants.filter(g => g.status === 'active'), expired: grants.filter(g => g.status === 'expired'), revoked: grants.filter(g => g.status === 'revoked') } as Record<string, any[]>
  return <section className="enter"><PageHead title={t('Sharing')} lead={t('Share only the documents you choose, with one organization, for one purpose, until a date you pick.')} />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card>{res ? <div>
        <h2 ref={head} tabIndex={-1} className="text-xl font-bold">✓ {t('Sharing link created')}</h2>
        <div className="mt-3 flex flex-wrap items-start gap-4"><img className="h-40 w-40 rounded-xl border border-line bg-white p-2" src={`/api/grants/${res.token}/qr.svg`} alt={t('QR code for the sharing request')} />
          <div className="min-w-0 flex-1 text-sm"><p>{t('Show this QR code or send the link to')} <b>{t(org)}</b>.</p><p className="hint mt-1 text-muted">{t('Demo QR: it holds only a random, temporary link. No personal data is stored in the QR code. This prototype does not use cryptographic signatures.')}</p>
            <label className="mt-2 block text-sm font-medium">{t('Sharing link')}<div className="mt-1 flex gap-2"><input readOnly className={inputCls + ' font-mono text-xs'} value={res.link} onFocus={e => e.target.select()} />
              <UAEButton variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(res.link); setCopied(true) } catch { setCopied(false) } }}>{copied ? t('Copied') : t('Copy')}</UAEButton></div></label></div></div>
        <div ref={report} className="doc-paper mt-5 rounded-xl border border-line bg-card p-4">
          <h3 className="text-lg font-bold">{t('What can the recipient see?')}</h3>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
            <dt className="text-muted">{t('Sharing reference ID')}</dt><dd className="font-mono">{res.ref}</dd><dt className="text-muted">{t('Recipient organization')}</dt><dd>{t(org)}</dd>
            <dt className="text-muted">{t('Purpose')}</dt><dd>{t(purpose)}</dd><dt className="text-muted">{t('QR created')}</dt><dd>{fmtDate(res.created, lang)}</dd>
            <dt className="text-muted">{t('Expires')}</dt><dd>{fmtDate(res.expires, lang)}</dd><dt className="text-muted">{t('Access status')}</dt><dd><Status code="active" /></dd>
            <dt className="text-muted">{t('Permitted records')}</dt><dd>{sel.length}</dd></dl>
          <table className="mt-3 w-full text-sm"><thead><tr className="border-b border-line"><th className="py-1 text-start">{t('Document')}</th><th className="py-1 text-start">{t('Issuer')}</th><th className="py-1 text-start">{t('Verification')}</th></tr></thead>
            <tbody>{sel.map(id => byId(id)).filter(Boolean).map(i => <tr key={i!.id} className="border-b border-line align-top"><td className="py-1 pe-2">{t(i!.title)}</td><td className="py-1 pe-2 text-muted">{t(i!.issuer)}</td><td className="py-1"><Status code={vstat(i!.status)} /></td></tr>)}</tbody></table>
          <p className="mt-3 text-sm font-medium">{t('Not shared')} ({excluded.length})</p><p className="text-sm text-muted">{excluded.map(i => t(i.title)).join(' · ')}{excluded.length ? ' · ' : ''}{t('Support documents, accessibility preferences')}</p>
          <p className="mt-2 text-xs text-muted">{t('The reviewer must sign in for this organization. Tayseer checks the organization, expiry, revocation and that each record is included before showing anything. Every access is logged.')}</p></div>
        <Row><UAEButton variant="secondary" onClick={() => printEl(report.current)}>{t('Print sharing report')}</UAEButton><UAEButton variant="destructive" onClick={() => revoke(res.token)}>{t('Stop sharing now')}</UAEButton><UAEButton variant="tertiary" onClick={reset}>{t('Share something else')}</UAEButton></Row></div>
        : <div>
          <ol className="mb-4 grid grid-cols-4 gap-1" aria-label={t('Sharing steps')}>{STEPS.map((x, i) => <li key={x} aria-current={i === step ? 'step' : undefined} className={`border-t-4 pt-1 text-xs sm:text-sm ${i <= step ? 'border-primary font-medium' : 'border-line text-muted'}`}>{i + 1}. {t(x)}</li>)}</ol>
          {step === 0 && <fieldset><legend><h2 ref={head} tabIndex={-1} className="text-xl font-bold">{t('Who are you sharing with?')}</h2></legend>
            <div className="mt-2 grid gap-2">{opts?.recipients.map(r => <label key={r.org} className={`block cursor-pointer rounded-xl border p-3 ${org === r.org ? 'border-primary bg-soft/50' : 'border-line'}`}>
              <span className="flex min-h-11 items-center gap-3"><input type="radio" name="org" className="h-5 w-5 accent-[var(--primary)]" checked={org === r.org} onChange={() => { setOrg(r.org); setSel([]) }} /><span><b>{t(r.org)}</b><span className="block text-sm text-muted">{t(r.kind)}</span></span></span>
              {org === r.org && <><p className="mt-2 text-sm font-medium">{t('This recipient asks for:')}</p><ReqPreview r={r} /></>}</label>)}</div></fieldset>}
          {step === 1 && <fieldset><legend><h2 ref={head} tabIndex={-1} className="text-xl font-bold">{t('Why are you sharing?')}</h2></legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">{opts?.purposes.map(x => <label key={x} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 ${purpose === x ? 'border-primary bg-soft' : 'border-line'}`}>
              <input type="radio" name="purpose" className="h-5 w-5 accent-[var(--primary)]" checked={purpose === x} onChange={() => setPurpose(x)} />{t(x)}</label>)}</div>
            <p className="hint mt-2 text-sm text-muted">{t('The recipient sees this purpose next to your records.')}</p></fieldset>}
          {step === 2 && <div><h2 ref={head} tabIndex={-1} className="text-xl font-bold">{t('Choose the documents to share')}</h2>
            <p className="hint mt-1 text-sm text-muted">{t('Requirements from')} {t(org)}. {t('Nothing is selected until you choose.')}</p>
            {R && <><h3 className="mt-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('Required')}</h3><ul className="divide-y divide-line">{R.required.map(q => <ReqBlock key={q.key} q={q} required />)}</ul>
              <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('Optional')}</h3><ul className="divide-y divide-line">{R.optional.map(q => <ReqBlock key={q.key} q={q} required={false} />)}</ul></>}
            {others.length > 0 && <details open className="mt-3 rounded-xl border border-line"><summary className="flex min-h-11 items-center gap-2 px-3 text-sm font-medium"><span aria-hidden className="chev text-primary">▸</span>{t('Other documents you can add')} ({others.length})</summary><div className="px-2 pb-2">{others.map(i => <Line key={i.id} i={i} />)}</div></details>}
            <Note>{t('Never shared here: private support documents, accessibility preferences and unrelated personal records.')}</Note>
            <p className="mt-2 text-sm"><b>{sel.length}</b> {t('selected')}{missingReq.length > 0 && <span className="text-warn"> · {missingReq.length} {t('required item(s) not selected')}</span>}</p></div>}
          {step === 3 && <div><h2 ref={head} tabIndex={-1} className="text-xl font-bold">{t('Review before you share')}</h2>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
              <dt className="text-muted">{t('Recipient')}</dt><dd className="font-medium">{t(org)} <button className="ms-2 underline text-primary cursor-pointer" onClick={() => setStep(0)}>{t('Change')}</button></dd>
              <dt className="text-muted">{t('Purpose')}</dt><dd className="font-medium">{t(purpose)} <button className="ms-2 underline text-primary cursor-pointer" onClick={() => setStep(1)}>{t('Change')}</button></dd>
              <dt className="text-muted">{t('Selected documents')}</dt><dd><ul className="list-disc ps-5">{sel.map(id => <li key={id}>{t(byId(id)?.title ?? id)} <span className="text-muted">· {t(byId(id)?.issuer ?? '')}</span></li>)}</ul><button className="underline text-primary cursor-pointer" onClick={() => setStep(2)}>{t('Change')}</button>
                {missingReq.length > 0 && <p className="text-warn">{t('Not selected but requested')}: {missingReq.map(q => t(q.label)).join(', ')}</p>}</dd>
              <dt className="text-muted">{t('Excluded documents')}</dt><dd className="text-muted">{excluded.length} {t('records')}: {excluded.slice(0, 6).map(i => t(i.title)).join(', ')}{excluded.length > 6 ? ' …' : ''}<br />{t('Support documents, accessibility preferences, applications')}</dd>
              <dt className="text-muted">{t('Access conditions')}</dt><dd><ul className="list-disc ps-5"><li>{t('Only a signed-in reviewer from this organization can open it')}</li><li>{t('Checked for expiry and revocation every time')}</li><li>{t('Every access is recorded in your access history')}</li><li>{t('You can revoke access at any time')}</li></ul></dd></dl>
            <Field label={t('Access expires after')}><select className={inputCls} value={days} onChange={e => setDays(+e.target.value)}>{opts?.days.map(d => <option key={d} value={d}>{d === 1 ? t('1 day') : `${d} ${t('days')}`}</option>)}</select></Field></div>}
          <Err m={m} />
          <div className="mt-4 flex flex-wrap gap-2">{step > 0 && <UAEButton variant="secondary" onClick={() => setStep(step - 1)}>{t('Back')}</UAEButton>}
            {step < 3 ? <UAEButton disabled={!canNext} onClick={() => setStep(step + 1)}>{t('Next')}</UAEButton> : <UAEButton onClick={confirm}>{t('Confirm and create QR code')}</UAEButton>}</div>
        </div>}</Card>
      <Card><h2 className="text-lg font-bold">{t('Your shares')}</h2>
        <div role="tablist" aria-label={t('Your shares')} className="mt-2 flex gap-1 border-b border-line">{(['active', 'expired', 'revoked'] as const).map(k => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px min-h-11 border-b-[3px] px-2 text-sm cursor-pointer ${tab === k ? 'border-primary font-medium' : 'border-transparent text-muted'}`}>{t(k === 'active' ? 'Active' : k === 'expired' ? 'Expired' : 'Revoked')} ({gl[k].length})</button>)}</div>
        {gl[tab].length === 0 ? <p className="mt-2 text-sm text-muted">{t('Nothing here.')}</p>
          : <ul>{gl[tab].map(g => <li key={g.token} className="border-b border-line py-3 last:border-0">
            <div className="flex flex-wrap items-center justify-between gap-2"><b>{t(g.org)}</b><Status code={g.status === 'active' ? 'active' : linkStatus(g.status)} /></div>
            <p className="text-xs text-muted"><span className="font-mono">{g.ref}</span> · {t(g.purpose || 'Scholarship application')} · {g.status === 'active' ? t('expires') : t('ended')} {fmtDate(g.expires, lang)}</p>
            <p className="text-sm">{g.ids.map((id: string) => t(byId(id)?.title ?? data.records.find(r => r.id === id)?.title ?? id)).join(', ')}</p>
            {g.decision && <p className={`mt-1 text-sm font-medium ${g.decision.status === 'approved' ? 'text-ok' : 'text-bad'}`}><span>{t(g.decision.status === 'approved' ? 'Approved by' : 'Rejected by')} {t(g.decision.org)}{g.decision.note ? ` · “${g.decision.note}”` : ''}</span></p>}
            <details className="mt-1 text-sm"><summary className="flex min-h-9 items-center gap-1 text-muted"><span aria-hidden className="chev">▸</span>{t('Access history')} ({(g.log ?? []).length})</summary>
              {(g.log ?? []).length ? <ul className="ms-5 list-disc">{g.log.map((l: any, i: number) => <li key={i}>{fmtDate(l.at, lang)} · {t(l.org)} · {t(l.result)}</li>)}</ul> : <p className="ms-5 text-muted">{t('Not opened yet.')}</p>}</details>
            {g.status === 'active' && <div className="mt-2 flex flex-wrap gap-2"><UAEButton variant="secondary" aria-expanded={qr === g.token} onClick={() => { setCopied(false); setQr(qr === g.token ? null : g.token) }}>{qr === g.token ? t('Hide QR') : t('Show QR')}</UAEButton><UAEButton variant="destructive" onClick={() => revoke(g.token)}>{t('Revoke')}</UAEButton></div>}
            {qr === g.token && <div className="mt-2 flex flex-col gap-3"><img className="h-36 w-36 rounded-xl border border-line bg-white p-2" src={`/api/grants/${g.token}/qr.svg`} alt={t('QR code for the sharing request')} />
              <label className="block w-full text-sm font-medium">{t('Sharing link')}<div className="mt-1 flex gap-2"><input readOnly className={inputCls + ' mono min-w-0 text-xs'} value={`${location.origin}/#/g/${g.token}`} onFocus={e => e.target.select()} />
                <UAEButton variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(`${location.origin}/#/g/${g.token}`); setCopied(true) } catch { setCopied(false) } }}>{copied ? t('Copied') : t('Copy')}</UAEButton></div>
                <span className="hint mt-1 block text-xs font-normal text-muted">{t('Send this link or show the QR code. The reviewer must sign in for this organization.')}</span></label></div>}
          </li>)}</ul>}</Card>
    </div></section>
}

export function ReviewView({ user, pending, clearPending }: P) {
  const t = useT(), lang = useLang(), [m, setM] = useState(''), [res, setRes] = useState<any>(null), [link, setLink] = useState(''), [scan, setScan] = useState(false), vid = useRef<HTMLVideoElement>(null), [doc, setDoc] = useState<Doc | null>(null), [note, setNote] = useState(''), [dm, setDm] = useState('')
  const decide = async (decision: string) => { const r = await api(`/grants/${res.token}/decision`, { decision, note }); if (r.ok) { setRes({ ...res, decision: r.decision }); setDm('') } else setDm(t(r.error)) }
  const open = async (tok: string) => { const r = await api(`/grants/${tok}/open`, {}); setRes({ ...r, checks: r.checks || [{ label: r.error || 'Denied', pass: false }], records: r.records || [] }); clearPending() }
  useEffect(() => { if (pending) open(pending) }, [pending]) // eslint-disable-line
  useEffect(() => {
    if (!scan) return
    let stream: MediaStream | null = null, timer: number
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (vid.current) { vid.current.srcObject = stream; await vid.current.play() }
        const det = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        timer = window.setInterval(async () => { try { const c = await det.detect(vid.current); const tok = c[0] && tokenOf(c[0].rawValue); if (tok) { setScan(false); open(tok) } } catch { /* keep scanning */ } }, 400)
      } catch { setScan(false); setM(t('Camera not available. Paste the link instead.')) }
    })()
    return () => { clearInterval(timer); stream?.getTracks().forEach(x => x.stop()) }
  }, [scan]) // eslint-disable-line
  const startScan = () => 'BarcodeDetector' in window ? (setM(''), setScan(true)) : setM(t('This browser cannot scan QR codes. Paste the link instead.'))
  const paste = () => { const k = tokenOf(link); k ? (setM(''), open(k)) : setM(t('That link is not a sharing link.')) }
  return <section className="enter"><PageHead title={t('Review shared records')} lead={t('The QR opens a request. Signing in proves who is looking. The server checks both.')} />
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><h2 className="text-lg font-bold">{t('Open a sharing request')}</h2><p className="text-sm">{t('Scan the learner’s QR with your camera, or paste the link.')}</p>
        <Row><UAEButton onClick={startScan}>{t('Scan QR')}</UAEButton></Row>{scan && <video ref={vid} playsInline muted className="w-full max-w-xs rounded-lg" />}
        <Field label={t('Sharing link')}><input className={inputCls} value={link} placeholder="http://…/#/g/…" onChange={e => setLink(e.target.value)} /></Field><Err m={m} /><UAEButton variant="secondary" onClick={paste}>{t('Open link')}</UAEButton>
        <p className="hint mt-3 text-sm text-muted">{t('Signed in as')} {t(user.name)} · {t(user.org)}</p></Card>
      {res && <Card><h2 className="text-lg font-bold">{t('Server checks')}</h2><ul className="mt-1">{res.checks.map((c: any, i: number) => <li key={i} className="flex items-start gap-2 py-1"><span aria-hidden className={c.pass ? 'text-ok' : 'text-bad'}>{c.pass ? '✔' : '✘'}</span><span>{t(c.label)} <span className="sr-only">{t(c.pass ? 'passed' : 'failed')}</span></span></li>)}</ul>
        {res.ok ? <><dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 rounded-xl bg-soft p-3 text-sm"><dt className="text-muted">{t('Sharing reference ID')}</dt><dd className="font-mono">{res.ref}</dd><dt className="text-muted">{t('Shared with')}</dt><dd>{t(res.org)}</dd><dt className="text-muted">{t('Purpose')}</dt><dd>{t(res.purpose)}</dd><dt className="text-muted">{t('Access expires')}</dt><dd>{fmtDate(res.expires, lang)}</dd></dl>
          <h3 className="mt-3 font-bold">{t('Records Sara authorized')} ({res.records.length})</h3>
          <ul className="mt-1">{res.records.map((r: Rec) => <li key={r.id} className="flex flex-wrap items-center gap-2 border-b border-line py-2 last:border-0"><span className="min-w-0 flex-1"><b>{t(r.title)}</b><span className="block text-xs text-muted">{t(r.issuer)} · {t(TYPE[r.type] ?? (r as any).kind ?? r.type)}{r.date ? ' · ' + fmtDate(r.date, lang) : ''}</span>{(r as any).project && <span className="block text-xs">{t('Project')}: {(r as any).project}</span>}</span><Status code={r.type === 'application' ? 'submitted' : 'verified'} />{r.type !== 'application' && <UAEButton variant="tertiary" className="min-h-9 px-2" onClick={() => setDoc({ ...(r as any), kind: (r as any).kind ?? r.type })}>{t('View')}</UAEButton>}</li>)}</ul>
          <p className="hint mt-2 text-xs text-muted">{t('Nothing else from the learner profile is visible to you.')}</p>
          <div className="mt-5 border-t border-line pt-4"><h3 className="font-bold">{t('Your decision')}</h3>
            {res.decision ? <p role="status" className="mt-2 text-sm"><Status code={res.decision.status === 'approved' ? 'accepted' : 'rejected'} /> <span className="ms-2">{fmtDate(res.decision.at, lang)}{res.decision.note ? ` · “${res.decision.note}”` : ''}</span><span className="mt-1 block text-xs text-muted">{t('The learner can see this decision on her share.')}</span></p>
              : <><Field label={t('Note to the learner (optional)')}><textarea rows={2} className={inputCls} value={note} maxLength={300} onChange={e => setNote(e.target.value)} /></Field><Err m={dm} />
                <div className="flex flex-wrap gap-2"><UAEButton onClick={() => decide('approved')}>{t('Approve')}</UAEButton><UAEButton variant="destructive" onClick={() => decide('rejected')}>{t('Reject')}</UAEButton></div>
                <p className="hint mt-2 text-xs text-muted">{t('Your decision is recorded in the access history and shown to the learner. It applies only to these shared records.')}</p></>}</div></>
          : <p className="mt-2 font-bold text-bad">{t('Access denied.')}</p>}</Card>}
    </div>{doc && <DocViewer doc={doc} learner={{ name: 'Sara A.', ref: 'ULL-2026-0048213' }} close={() => setDoc(null)} />}</section>
}
