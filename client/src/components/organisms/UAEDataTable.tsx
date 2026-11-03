import { useState, type ReactNode } from 'react'
export interface Col { key: string; header?: string }
export function UAEDataTable({ columns, rows, sortable=false }: { columns: Col[]; rows: Record<string, ReactNode>[]; sortable?: boolean }) {
  const [by, setBy] = useState<string | null>(null)
  const sorted = by ? [...rows].sort((a, b) => String(a[by]).localeCompare(String(b[by]))) : rows
  const hasHead = columns.some(c => c.header)
  return <div className="overflow-x-auto"><table className="w-full text-sm">{hasHead && <thead><tr className="border-b border-line">{columns.map(c => <th key={c.key} className="text-start p-2 font-semibold" aria-sort={by === c.key ? 'ascending' : undefined}>
    {sortable ? <button className="font-semibold cursor-pointer" onClick={() => setBy(c.key)}>{c.header}</button> : c.header}</th>)}</tr></thead>}
    <tbody>{sorted.map((r, i) => <tr key={i} className="border-b border-line last:border-0">{columns.map(c => <td key={c.key} className="p-2 pe-3 align-top">{r[c.key]}</td>)}</tr>)}</tbody></table></div>
}
