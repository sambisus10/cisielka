import { Link, useNavigate } from 'react-router-dom'
import { Bell, Smartphone, UserRound } from 'lucide-react'
import type { AppState, HistoryEvent, Request } from '../data/types'
import { requestDisplayStatus } from '../store/AppStore'
import { cn, REQUEST_TYPE_LABEL, RequestStatusBadge } from './ui'
import { daysUntil, formatDate, formatDateTime, plural, relativeDays } from '../lib/format'

/** '1 deň', '3 dni', '5 dní' */
export const daysWord = (n: number) => plural(n, 'deň', 'dni', 'dní')
/** 'po 1 dni', 'po 3 dňoch' */
export const afterDays = (n: number) => `po ${n} ${n === 1 ? 'dni' : 'dňoch'}`

export function ProgressBar({ done, total, className }: { done: number; total: number; className?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  const complete = total > 0 && done === total
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
        <div className={cn('h-full rounded-full', complete ? 'bg-accent-600' : 'bg-zinc-400')} style={{ width: `${pct}%` }} />
      </div>
      <span className="num text-xs text-zinc-600">
        {total ? `${done}/${total}` : '–'}
      </span>
    </div>
  )
}

export function DueCell({ r, today }: { r: Request; today: string }) {
  const d = daysUntil(r.dueDate, today)
  let hint: string
  let tone = 'text-zinc-500'
  if (r.status === 'resolved') hint = ''
  else if (r.status === 'waiting_client' && d < 0) {
    hint = `po termíne ${daysWord(-d)}`
    tone = 'text-red-600'
  } else if (d === 0) {
    hint = 'dnes'
    tone = r.status === 'waiting_client' ? 'text-amber-700' : 'text-zinc-500'
  } else if (d === 1) hint = 'zajtra'
  else if (d > 0) hint = `o ${daysWord(d)}`
  else hint = ''
  return (
    <div className="leading-tight">
      <div className="num text-sm text-zinc-800">{formatDate(r.dueDate)}</div>
      {hint && <div className={cn('text-xs', tone)}>{hint}</div>}
    </div>
  )
}

export function remindersLabel(r: Request) {
  if (!r.remindersEnabled) return 'vypnuté'
  if (r.remindersSent === 0) return r.status === 'waiting_client' ? 'zapnuté' : '–'
  return plural(r.remindersSent, 'odoslaná', 'odoslané', 'odoslaných')
}

/** Posledná zmena požiadavky – najnovšia udalosť v histórii */
export function lastChangeByRequest(state: AppState) {
  const map = new Map<string, string>()
  for (const e of state.events) {
    if (!e.requestId) continue
    const prev = map.get(e.requestId)
    if (!prev || e.at > prev) map.set(e.requestId, e.at)
  }
  return map
}

const STATUS_ORDER = { overdue: 0, waiting_accountant: 1, waiting_client: 2, resolved: 3 } as const

export function sortRequests(list: Request[], today: string) {
  return [...list].sort((a, b) => {
    const sa = STATUS_ORDER[requestDisplayStatus(a, today)]
    const sb = STATUS_ORDER[requestDisplayStatus(b, today)]
    if (sa !== sb) return sa - sb
    if (a.status === 'resolved') return (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? '')
    return a.dueDate.localeCompare(b.dueDate)
  })
}

export const TH = 'px-4 py-2 text-left text-xs font-medium text-zinc-500 whitespace-nowrap'
export const TD = 'px-4 py-2.5 align-middle'

export function RequestsTable({ requests, state, showClient = true, compact = false }: { requests: Request[]; state: AppState; showClient?: boolean; compact?: boolean }) {
  const navigate = useNavigate()
  const lastChange = lastChangeByRequest(state)
  const clientName = (id: string) => state.clients.find((c) => c.id === id)?.name ?? ''
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50/60">
          <tr>
            <th className={TH}>Požiadavka</th>
            {showClient && <th className={TH}>Klient</th>}
            <th className={TH}>Stav</th>
            <th className={TH}>Termín</th>
            {!compact && <th className={TH}>Pripomienky</th>}
            <th className={TH}>Posledná zmena</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const changed = lastChange.get(r.id) ?? r.createdAt
            return (
              <tr key={r.id} onClick={() => navigate(`/requests/${r.id}`)} className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className={cn(TD, 'max-w-[320px]')}>
                  <Link to={`/requests/${r.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-zinc-900 hover:underline">
                    {r.title}
                  </Link>
                  <div className="text-xs text-zinc-500">{REQUEST_TYPE_LABEL[r.type]}</div>
                </td>
                {showClient && <td className={cn(TD, 'whitespace-nowrap text-zinc-700')}>{clientName(r.clientId)}</td>}
                <td className={TD}>
                  <RequestStatusBadge status={requestDisplayStatus(r, state.today)} />
                </td>
                <td className={cn(TD, 'whitespace-nowrap')}>
                  <DueCell r={r} today={state.today} />
                </td>
                {!compact && (
                  <td className={cn(TD, 'whitespace-nowrap text-xs', r.remindersEnabled ? 'text-zinc-600' : 'text-zinc-400')}>
                    {remindersLabel(r)}
                    {r.accountantAlerted && r.status === 'waiting_client' && <div className="text-red-600">klient nereaguje</div>}
                  </td>
                )}
                <td className={cn(TD, 'whitespace-nowrap text-xs text-zinc-500')} title={formatDateTime(changed)}>
                  {relativeDays(changed, state.today)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const ACTOR_ICON = { accountant: UserRound, client: Smartphone, system: Bell }
const ACTOR_LABEL = { accountant: 'Vy', client: 'Klient', system: 'Automaticky' }

export function Timeline({ events, state, showClient = false, showRequest = false }: { events: HistoryEvent[]; state: AppState; showClient?: boolean; showRequest?: boolean }) {
  if (!events.length) return <p className="px-4 py-6 text-center text-sm text-zinc-500">Zatiaľ žiadna história</p>
  return (
    <ol className="relative px-4 py-3">
      {events.map((e, i) => {
        const Icon = ACTOR_ICON[e.actor]
        const client = showClient ? state.clients.find((c) => c.id === e.clientId) : undefined
        const req = showRequest && e.requestId ? state.requests.find((r) => r.id === e.requestId) : undefined
        return (
          <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < events.length - 1 && <span className="absolute left-[11px] top-6 bottom-0 w-px bg-zinc-200" />}
            <span className="relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400">
              <Icon size={12} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm text-zinc-800">
                {client && <span className="font-medium text-zinc-900">{client.name}: </span>}
                {e.text}
              </p>
              {req && (
                <Link to={`/requests/${req.id}`} className="block truncate text-xs text-zinc-600 hover:text-zinc-900 hover:underline">
                  {req.title}
                </Link>
              )}
              <p className="num text-xs text-zinc-500">
                {formatDateTime(e.at)} · {ACTOR_LABEL[e.actor]}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
