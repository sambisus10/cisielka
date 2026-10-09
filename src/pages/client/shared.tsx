import { FileText, Image as ImageIcon } from 'lucide-react'
import type { Document, Request } from '../../data/types'
import { cn } from '../../components/ui'
import { daysUntil, formatShortDate } from '../../lib/format'

/** Spoločné drobnosti klientskeho portálu */

export const firstName = (fullName: string | undefined) => (fullName ?? '').split(' ')[0]

/** Termín požiadavky z pohľadu klienta: 'do 10. 10.', 'do dnes', 'po termíne' */
export function dueInfo(r: Request, today: string): { label: string; overdue: boolean } {
  const d = daysUntil(r.dueDate, today)
  if (d < 0) return { label: 'po termíne', overdue: true }
  if (d === 0) return { label: 'do dnes', overdue: false }
  if (d === 1) return { label: 'do zajtra', overdue: false }
  return { label: `do ${formatShortDate(r.dueDate)}`, overdue: false }
}

/** Náhľad súboru – obrázok alebo ikona dokumentu */
export function FileThumb({ doc, size = 'md' }: { doc: Document; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9' : 'h-12 w-12'
  if (doc.fileType === 'image' && doc.fileUrl) {
    return <img src={doc.fileUrl} alt="" className={cn(box, 'shrink-0 rounded-md border border-zinc-200 bg-zinc-100 object-cover')} />
  }
  const Icon = doc.fileType === 'pdf' ? FileText : ImageIcon
  return (
    <span className={cn(box, 'flex shrink-0 flex-col items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500')}>
      <Icon size={size === 'sm' ? 16 : 18} strokeWidth={1.75} />
      {doc.fileType === 'pdf' && size === 'md' && <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">pdf</span>}
    </span>
  )
}

/** Veľké dotykové tlačidlá (min. 44 px) */
export const bigPrimary =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 text-[15px] font-medium text-white transition-colors hover:bg-accent-700 disabled:bg-zinc-200 disabled:text-zinc-400'
export const bigSecondary =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50'
