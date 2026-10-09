import DocPreview from '../../components/DocPreview'
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

/** Náhľad súboru – zmenšený papierový náhľad (obrázok, PDF alebo vygenerovaný z údajov dokladu) */
export function FileThumb({ doc, size = 'md' }: { doc: Document; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('block shrink-0', size === 'sm' ? 'w-7' : 'w-10')}>
      <DocPreview doc={doc} compact />
    </span>
  )
}

/** Veľké dotykové tlačidlá (min. 44 px) */
export const bigPrimary =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 text-[15px] font-medium text-white transition-colors hover:bg-accent-700 disabled:bg-zinc-200 disabled:text-zinc-400'
export const bigSecondary =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50'
