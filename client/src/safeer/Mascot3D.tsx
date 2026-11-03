import { useEffect, useRef, useState } from 'react'
export type MascotState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'teaching' | 'celebrate' | 'curious' | 'wink'
// WebGL is probed once per page; the probe context is released straight away
let webgl: boolean | undefined
function hasWebGL() {
  if (webgl === undefined) {
    try {
      const g = document.createElement('canvas').getContext('webgl'), dbg = g?.getExtension('WEBGL_debug_renderer_info')
      const gpu = g && dbg ? String(g.getParameter((dbg as any).UNMASKED_RENDERER_WEBGL)) : ''
      // no GPU (software rendering) would make the page sluggish, so the 2D falcon is used there; add ?safeer3d to force 3D
      webgl = !!g && (/[?&]safeer3d\b/.test(location.search) || !/swiftshader|llvmpipe|software/i.test(gpu)); (g?.getExtension('WEBGL_lose_context') as any)?.loseContext()
    } catch { webgl = false }
  }
  return webgl
}
// Safeer in 3D. The three.js engine is loaded on demand; without WebGL the 2D Safeer is shown instead.
export function Mascot3D({ state, size = 88, close = true, label = 'Safeer' }: { state: MascotState; size?: number; close?: boolean; label?: string }) {
  const ref = useRef<HTMLDivElement>(null), st = useRef(state), [ok, setOk] = useState(true)
  st.current = state
  useEffect(() => {
    const el = ref.current; if (!el) return
    let stop: (() => void) | undefined, dead = false
    if (!hasWebGL()) { setOk(false); return }
    import('./mascot-engine').then((m: any) => { if (dead) return; try { stop = m.startMascot(el, () => st.current, close) } catch { setOk(false) } }).catch(() => setOk(false))
    return () => { dead = true; stop?.() }
  }, [close])
  return ok ? <div ref={ref} className="m3d" style={{ width: size, height: size }} role="img" aria-label={label} /> : <SafeerAvatar size={size} label={label} />
}
// 2D fallback: the same falcon, flat
export function SafeerAvatar({ size = 64, label = 'Safeer' }: { size?: number; label?: string }) {
  return <svg viewBox="60 24 180 184" width={size} height={size} role="img" aria-label={label}>
    <path d="M70 128C64 70 100 36 150 36S236 70 230 128C228 162 196 186 150 186S72 162 70 128Z" fill="#f5b73a" /><path d="M70 128C62 72 100 30 150 32S238 72 230 128C208 90 182 70 150 70S92 90 70 128Z" fill="#df8f20" />
    <path d="M100 120C100 150 120 172 150 172S200 150 200 120C186 104 170 98 150 98S114 104 100 120Z" fill="#fff6e4" />
    {[118, 182].map(x => <g key={x}><ellipse cx={x} cy="116" rx="15" ry="19" fill="#4a2a18" /><circle cx={x + 4} cy="108" r="5" fill="#fff" /></g>)}
    <path d="M140 132C144 126 156 126 160 132C160 144 154 152 150 156C146 152 140 144 140 132Z" fill="#e8741c" />
    <circle cx="150" cy="40" r="9" fill="#ffd36a" /></svg>
}
