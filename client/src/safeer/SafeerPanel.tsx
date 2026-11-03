import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useLang, useT } from '../i18n'
import type { User, View } from '../types'
import { Mascot3D, type MascotState } from './Mascot3D'

type Msg = { r: 'u' | 'a'; t: string; src?: string }
type Tab = 'ask' | 'agent' | 'guide'
const CHIPS: Record<string, string[]> = {
  sara: ['Which documents are missing?', 'What am I good at?', 'Who can see my data?', 'How are my transfers going?', 'Which opportunities fit me?'],
  parent: ['What does Sara allow me to do?', 'What are the upcoming deadlines?', 'Where is the application draft?'],
  advisor: ['Which learners can I see?', 'What am I not allowed to see?'], teacher: ['Which learners can I see?', 'What am I not allowed to see?'],
  reviewer: ['How do I review a shared request?', 'How many shares are addressed to us?'],
  admin: ['Can we issue records?', 'Any correction requests?'], organizer: ['Can we issue records?', 'Any correction requests?'],
  governance: ['Which issuers need a decision?'], operator: ['Which issuers need a decision?'], coordinator: ['How many support requests are waiting?'] }
const ROLE_HELLO: Record<string, string> = { sara: 'Hi Sara! What would you like to do?', parent: 'Hello! I can help you support Sara within what she allows.', advisor: 'Hello! I can help you find the learners and records you are allowed to see.', teacher: 'Hello! I can help you find the learners and records you are allowed to see.',
  reviewer: 'Hello! I can explain how to review a shared request.', admin: 'Hello! I can help with issuing and corrections.', organizer: 'Hello! I can help with issuing and corrections.', governance: 'Hello! I can summarise issuer decisions.', operator: 'Hello! I can summarise the platform state.', coordinator: 'Hello! I can summarise support requests.' }

// Safeer: one character for everything. Chat (Ask), agent (Find what to do next, student only) and guide (go to a page).
export function SafeerPanel({ user, close, go, guide }: { user: User; close: () => void; go: (v: View, o?: any) => void; guide: { label: string; view: View; opts?: any }[] }) {
  const t = useT(), lang = useLang(), sara = user.role === 'sara', [tab, setTab] = useState<Tab>('ask'), [m, setM] = useState<Msg[]>([]), [q, setQ] = useState(''), [busy, setBusy] = useState(false), [spoke, setSpoke] = useState(false)
  const [mode, setMode] = useState<{ live: boolean; model?: string } | null>(null), [consent, setConsent] = useState(false), [run, setRun] = useState<any>(null), [agentBusy, setAgentBusy] = useState(false), [done, setDone] = useState<string[]>([]), [err, setErr] = useState('')
  const end = useRef<HTMLDivElement>(null), closeBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => { api('/safeer/health').then(r => r.ok && setMode({ live: r.live, model: r.model })); closeBtn.current?.focus(); const k = (e: KeyboardEvent) => e.key === 'Escape' && close(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, []) // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }) }, [m, busy])
  const mood: MascotState = run && !agentBusy && tab === 'agent' ? 'celebrate' : busy || agentBusy ? 'thinking' : spoke ? 'speaking' : tab === 'agent' ? 'teaching' : tab === 'ask' && m.length ? 'listening' : tab === 'guide' ? 'curious' : 'wink'
  const send = async (x: string) => { if (!x.trim() || busy) return; setM(p => [...p, { r: 'u', t: x }]); setQ(''); setBusy(true); const r = await api('/safeer/ask', { question: x, lang }); setBusy(false)
    setM(p => [...p, { r: 'a', t: r.ok ? r.answer : t(r.error || 'Safeer is unavailable right now.'), src: r.source }]); setSpoke(true); setTimeout(() => setSpoke(false), 3200) }
  const runAgent = async () => { setAgentBusy(true); setRun(null); setErr(''); setDone([]); const r = await api('/safeer/agent', { consent, lang }); setAgentBusy(false); r.ok ? setRun(r) : setErr(t(r.error)) }
  const badge = !mode ? '…' : mode.live ? `${t('AI: live model')} · ${mode.model}` : t('AI: simulation (no model connected)')
  const tabs: [Tab, string][] = [['ask', 'Ask'], ...(sara ? [['agent', 'Find what to do next'] as [Tab, string]] : []), ['guide', 'Guide me']]
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={e => e.target === e.currentTarget && close()}>
    <aside role="dialog" aria-modal="true" aria-label={t('Safeer, your AI assistant')} className="safeer-drawer flex h-full w-[min(96vw,30rem)] flex-col border-s border-line bg-bg shadow-2xl">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Mascot3D state={mood} size={64} label={t('Safeer the falcon')} />
        <div className="min-w-0 flex-1"><p className="eyebrow">{t('AI assistant · agent · guide')}</p><h2 className="text-xl font-bold">{t('Safeer')} <span className="text-base font-medium text-muted">سفير</span></h2>
          <span className="text-xs text-muted" data-testid="safeer-mode">{badge}</span></div>
        <button ref={closeBtn} onClick={close} aria-label={t('Close Safeer')} className="min-h-11 min-w-11 rounded-[10px] border border-line text-lg hover:border-fg cursor-pointer">✕</button></div>
      <div role="tablist" aria-label={t('Safeer')} className="flex gap-1 border-b border-line px-3">{tabs.map(([k, l]) =>
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px min-h-11 border-b-[3px] px-3 text-sm font-medium cursor-pointer ${tab === k ? 'border-primary text-fg' : 'border-transparent text-muted hover:text-fg'}`}>{t(l)}</button>)}</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === 'ask' && <div className="flex flex-col gap-3">
          {m.length === 0 && <><div className="flex justify-center py-2"><Mascot3D state={mood} size={150} close={false} label={t('Safeer the falcon')} /></div>
            <p className="rounded-xl bg-soft px-3 py-2 text-sm">{t(ROLE_HELLO[user.role] ?? 'Hello! How can I help?')}</p>
            <div className="flex flex-wrap gap-2">{(CHIPS[user.role] ?? []).map(c => <button key={c} onClick={() => send(t(c))} className="min-h-9 rounded-full border border-line bg-card px-3 text-xs hover:border-fg cursor-pointer">{t(c)}</button>)}</div></>}
          {m.map((x, i) => x.r === 'u' ? <p key={i} className="ms-auto max-w-[85%] rounded-2xl rounded-ee-sm bg-primary px-3 py-2 text-sm text-primary-fg">{x.t}</p>
            : <div key={i} className="max-w-[92%] rounded-2xl rounded-es-sm border border-line bg-card px-3 py-2 text-sm"><p className="whitespace-pre-wrap">{x.t}</p><p className="mt-1 text-[11px] text-muted">{x.src === 'model' ? t('Answered by the AI model from the facts your role may see') : t('Answered by rules from the facts your role may see')}</p></div>)}
          {busy && <p className="dots w-fit rounded-2xl border border-line bg-card px-3 py-2 text-muted" aria-label={t('Safeer is typing')}><i /><i /><i /></p>}<div ref={end} /></div>}
        {tab === 'agent' && sara && <div className="flex flex-col gap-4">
          <label className="flex items-start gap-3 rounded-xl border border-line bg-card p-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]" checked={consent} onChange={e => { setConsent(e.target.checked); if (!e.target.checked) setRun(null) }} />
            <span className="text-sm"><b>{t('Let Safeer use my profile summary')}</b><span className="mt-1 block text-xs text-muted">{t('Safeer will see: your verified records and documents, your interests, missing transfer documents and opportunity scores. Safeer will not see: your name, learner ID, Emirates ID or support documents. You can switch this off any time.')}</span></span></label>
          <button disabled={!consent || agentBusy} onClick={runAgent} className="min-h-11 rounded-[10px] bg-primary px-4 font-medium text-primary-fg disabled:opacity-50 cursor-pointer">{agentBusy ? t('Safeer is working…') : run ? t('Ask Safeer again') : t('Find what I should do next')}</button>
          {err && <p role="alert" className="text-sm text-bad">{err}</p>}
          {run && <>
            <ol aria-label={t('What Safeer did')} className="flex flex-col gap-1.5">{run.trace.map((s: any, i: number) => <li key={i} className="flex gap-2 text-sm"><span className={`mt-0.5 h-fit shrink-0 rounded-full border px-2 text-[10px] font-semibold ${s.who === 'ai' ? 'border-primary text-primary' : 'border-line text-muted'}`}>{s.who === 'ai' ? 'AI' : t('Code')}</span><span>{s.text}</span></li>)}</ol>
            <div><h3 className="eyebrow mb-2">{t('Where to go next')}</h3>
              <ul className="flex flex-col gap-2">{run.picks.map((p: any) => <li key={p.id} className="rounded-xl border border-line bg-card p-3">
                <div className="flex items-baseline justify-between gap-2"><b>{t(p.title)}</b><span className="mono text-xs text-muted">{t('fit')} {p.score}/100</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft"><i className="block h-full bg-primary" style={{ width: p.score + '%' }} /></div>
                <p className="mt-2 text-sm">{p.why}</p><p className="mt-1 text-xs text-muted">{t(p.org)} · {t('Deadline')}: {p.deadline}</p></li>)}</ul>
              <p className="mt-2 text-xs font-medium text-warn">{run.note}</p></div>
            <div><h3 className="eyebrow mb-2">{t('My first week')}</h3>
              <ol className="flex flex-col gap-1">{run.week.map((w: any) => <li key={w.ref} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-[var(--primary)]" aria-label={`${t('Done')}: ${t('Day')} ${w.day}`} checked={done.includes(w.ref)} onChange={() => setDone(d => d.includes(w.ref) ? d.filter(x => x !== w.ref) : [...d, w.ref])} />
                <span className={`min-w-0 flex-1 ${done.includes(w.ref) ? 'text-muted line-through' : ''}`}><b>{t('Day')} {w.day}</b> · {w.text}</span>
                {w.view && <button className="shrink-0 text-xs text-primary underline cursor-pointer" onClick={() => { go(w.view, w.ref.startsWith('transfer:TR-UNI') ? { tab: 'university' } : undefined); close() }}>{t('Go')}</button>}</li>)}</ol></div>
            <details className="text-xs"><summary className="cursor-pointer text-muted">{t('Exactly what Safeer saw')}</summary><pre dir="ltr" className="mt-1 max-h-60 overflow-auto rounded-lg border border-line bg-card p-2">{JSON.stringify(run.payload, null, 1)}</pre></details></>}
          {!consent && !run && <p className="text-sm text-muted">{t('Switch on the permission above to let Safeer suggest what to do next. Everything else in Tayseer works without it.')}</p>}
        </div>}
        {tab === 'guide' && <div className="flex flex-col gap-2"><p className="text-sm text-muted">{t('Where would you like to go?')}</p>
          {guide.map(g => <button key={g.label + g.view} onClick={() => { go(g.view, g.opts); close() }} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line bg-card px-3 text-start text-sm hover:border-fg cursor-pointer"><span>{t(g.label)}</span><span aria-hidden className="text-muted rtl:-scale-x-100">→</span></button>)}</div>}
      </div>
      {tab === 'ask' && <div className="flex gap-2 border-t border-line px-4 py-3"><input className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-card px-3 text-sm" value={q} placeholder={t('Ask Safeer anything…')} aria-label={t('Your question')} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(q)} />
        <button onClick={() => send(q)} disabled={busy} className="min-h-11 rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-50 cursor-pointer">{t('Send')}</button></div>}
      <p className="border-t border-line px-4 py-2 text-[11px] text-muted">{t('Safeer only uses what your role is allowed to see, never support documents, and never decides eligibility.')}</p>
    </aside></div>
}
