import { useState } from 'react'
import { api } from '../../api'
import { useT } from '../../i18n'
import { UAEButton } from '../atoms/UAEButton'
export function SignPanel({ view, canRequest, onClose }: { view: string; canRequest: boolean; onClose: () => void }) {
  const t = useT(), [failed, setFailed] = useState(false), [big, setBig] = useState(false), [msg, setMsg] = useState('')
  const ask = async () => { const r = await api('/interpreter', {}); setMsg(r.ok ? t('Interpreter requested. The support coordinator will confirm.') : t(r.error)) }
  return <aside aria-label={t('Sign language')} className={`fixed bottom-4 end-4 z-40 bg-card border-2 border-primary rounded-2xl p-4 shadow-xl ${big ? 'w-[min(92vw,24rem)]' : 'w-[min(92vw,18rem)]'}`}>
    <div className="flex justify-between items-center mb-2"><b className="font-head">{t('Emirati Sign Language')}</b>
      <span className="flex gap-1"><button className="min-w-9 min-h-9 border border-line rounded-lg" aria-label={t(big ? 'Smaller' : 'Larger')} onClick={() => setBig(!big)}>{big ? '−' : '+'}</button>
        <button className="min-w-9 min-h-9 border border-line rounded-lg" aria-label={t('Close')} onClick={onClose}>×</button></span></div>
    {failed ? <div className="text-sm border border-dashed border-line rounded-lg p-3"><p>{t('The sign language clip for this screen is not recorded yet.')}</p><p className="text-muted mt-1">{t('In the full service, certified interpreters record one short captioned clip per screen.')}</p></div>
      : <video key={view} className="w-full rounded-lg bg-black" controls playsInline src={`/sign/${view}.mp4`} onError={() => setFailed(true)} />}
    {canRequest && <div className="mt-3"><UAEButton variant="secondary" className="w-full" onClick={ask}>{t('Request an interpreter')}</UAEButton><p role="status" className="text-sm mt-2">{msg}</p></div>}
  </aside>
}
