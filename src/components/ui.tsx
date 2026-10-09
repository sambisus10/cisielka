import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { DocumentStatus, RequestType } from '../data/types'
import type { RequestDisplayStatus } from '../store/AppStore'

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

/* ---------- Button ---------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 border border-accent-700/20 shadow-xs',
  secondary: 'bg-white text-zinc-800 hover:bg-zinc-50 border border-zinc-300 shadow-xs',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent',
  danger: 'bg-white text-red-700 hover:bg-red-50 border border-zinc-300 shadow-xs',
}
const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

/* ---------- Badge ---------- */

type Tone = 'neutral' | 'blue' | 'amber' | 'red' | 'green' | 'accent'

const tones: Record<Tone, { bg: string; dot: string }> = {
  neutral: { bg: 'bg-zinc-100 text-zinc-700 ring-zinc-200', dot: 'bg-zinc-400' },
  blue: { bg: 'bg-sky-50 text-sky-800 ring-sky-200/70', dot: 'bg-sky-500' },
  amber: { bg: 'bg-amber-50 text-amber-800 ring-amber-200/70', dot: 'bg-amber-500' },
  red: { bg: 'bg-red-50 text-red-700 ring-red-200/70', dot: 'bg-red-500' },
  green: { bg: 'bg-emerald-50 text-emerald-800 ring-emerald-200/70', dot: 'bg-emerald-500' },
  accent: { bg: 'bg-accent-50 text-accent-800 ring-accent-200/70', dot: 'bg-accent-500' },
}

export function Badge({ tone = 'neutral', dot = true, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone].bg, className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', tones[tone].dot)} />}
      {children}
    </span>
  )
}

export const REQUEST_STATUS: Record<RequestDisplayStatus, { label: string; clientLabel: string; tone: Tone }> = {
  waiting_client: { label: 'Čaká na klienta', clientLabel: 'Čaká na vás', tone: 'amber' },
  waiting_accountant: { label: 'Čaká na mňa', clientLabel: 'Odovzdané', tone: 'blue' },
  resolved: { label: 'Vyriešené', clientLabel: 'Vybavené', tone: 'green' },
  overdue: { label: 'Po termíne', clientLabel: 'Po termíne', tone: 'red' },
}

export function RequestStatusBadge({ status, audience = 'accountant' }: { status: RequestDisplayStatus; audience?: 'accountant' | 'client' }) {
  const s = REQUEST_STATUS[status]
  return <Badge tone={s.tone}>{audience === 'client' ? s.clientLabel : s.label}</Badge>
}

export const DOCUMENT_STATUS: Record<DocumentStatus, { label: string; tone: Tone }> = {
  uploaded: { label: 'Nahrané', tone: 'blue' },
  reviewed: { label: 'Skontrolované', tone: 'accent' },
  exported: { label: 'Exportované', tone: 'neutral' },
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const s = DOCUMENT_STATUS[status]
  return <Badge tone={s.tone}>{s.label}</Badge>
}

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  document: 'Nahrať doklad',
  question: 'Otázka',
  info: 'Dodať informáciu',
}

export const DOCUMENT_KIND_LABEL = {
  received_invoice: 'Prijatá faktúra',
  issued_invoice: 'Vydaná faktúra',
  receipt: 'Pokladničný doklad',
  bank_statement: 'Bankový výpis',
  other: 'Iný doklad',
} as const

/* ---------- Layout primitives ---------- */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-lg border border-zinc-200 bg-white', className)}>{children}</div>
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6">
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .replace(/s\.r\.o\.|a\.s\.|–.*$/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md bg-zinc-100 font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200',
        size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
      )}
    >
      {initials}
    </span>
  )
}

/** Segmentové prepínanie (filtre, záložky) */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T
  onChange: (v: T) => void
  items: { value: T; label: string; count?: number }[]
}) {
  return (
    <div className="flex gap-1 border-b border-zinc-200">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onChange(it.value)}
          className={cn(
            '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            value === it.value ? 'border-accent-600 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800',
          )}
        >
          {it.label}
          {it.count !== undefined && (
            <span className={cn('num rounded px-1.5 text-xs', value === it.value ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600')}>{it.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/30 p-4 pt-[10vh]" onMouseDown={onClose}>
      <div className={cn('w-full rounded-lg border border-zinc-200 bg-white shadow-xl', width)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Zavrieť">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
