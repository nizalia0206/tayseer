import type { ReactNode } from 'react'
export const inputCls = 'block w-full mt-1 min-h-[44px] px-3 py-2 border border-line rounded-lg bg-bg text-fg'
export const Field = ({ label, children, helper }: { label: string; children: ReactNode; helper?: string }) =>
  <label className="block my-3 text-sm font-medium">{label}{children}{helper && <span className="hint block text-sm text-muted font-normal mt-1">{helper}</span>}</label>
export const Err = ({ m }: { m: string }) => m ? <p role="alert" className="text-bad font-medium my-2">{m}</p> : <p role="alert" className="sr-only" />
