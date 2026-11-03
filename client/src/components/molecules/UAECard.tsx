import type { ReactNode } from 'react'
// Tayseer card: rounded-2xl, warm border, white surface.
export const Card = ({ children, className='', id }: { children: ReactNode; className?: string; id?: string }) =>
  <div id={id} className={`rounded-[14px] border border-line bg-card p-4 sm:p-6 ${className}`}>{children}</div>
export const Grid = ({ children }: { children: ReactNode }) => <div className="grid gap-3 md:grid-cols-2">{children}</div>
export const Row = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap gap-2 my-3">{children}</div>
export const Lead = ({ children }: { children: ReactNode }) => <p className="hint max-w-prose text-muted mb-4">{children}</p>
export const List = ({ children }: { children: ReactNode }) => <ul className="my-2 [&>li]:py-2 [&>li]:border-b [&>li]:border-line last:[&>li]:border-0">{children}</ul>
