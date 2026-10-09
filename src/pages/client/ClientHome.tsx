import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { isOverdue, useStore } from '../../store/AppStore'
import type { Request } from '../../data/types'
import { cn } from '../../components/ui'
import { formatShortDate } from '../../lib/format'
import { dueInfo, firstName } from './shared'

const COUNT_WORDS = ['', 'jednu vec', 'dve veci', 'tri veci', 'štyri veci']
const thingsCount = (n: number) => COUNT_WORDS[n] ?? `${n} vecí`

const TYPE_HINT: Record<Request['type'], string> = {
  document: 'Doklad',
  question: 'Otázka',
  info: 'Informácia',
}

export default function ClientHome() {
  const { state } = useStore()
  const [showSubmitted, setShowSubmitted] = useState(false)
  const client = state.clients.find((c) => c.id === state.portalClientId)
  const mine = state.requests.filter((r) => r.clientId === state.portalClientId)

  const open = mine
    .filter((r) => r.status === 'waiting_client')
    .sort((a, b) => {
      const oa = isOverdue(a, state.today) ? 0 : 1
      const ob = isOverdue(b, state.today) ? 0 : 1
      return oa - ob || a.dueDate.localeCompare(b.dueDate)
    })
  const submitted = mine.filter((r) => r.status === 'waiting_accountant').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const resolved = mine.filter((r) => r.status === 'resolved')

  return (
    <div>
      <div className="px-1 pb-5 pt-2">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">Dobrý deň, {firstName(client?.contactName)}.</h1>
        <p className="mt-1 text-[15px] text-zinc-600">
          {open.length > 0
            ? `Účtovníčka ${state.accountant.firstName} od vás potrebuje ${thingsCount(open.length)}.`
            : 'Všetko máte odovzdané. Ďakujeme.'}
        </p>
      </div>

      {open.length > 0 ? (
        <ul className="space-y-3">
          {open.map((r) => (
            <li key={r.id}>
              <OpenRequestCard r={r} today={state.today} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-6 text-sm text-zinc-600">
          Keď bude účtovníčka niečo potrebovať, príde vám email a požiadavka sa zobrazí tu.
        </div>
      )}

      {submitted.length > 0 && (
        <section className="mt-7">
          <button
            type="button"
            onClick={() => setShowSubmitted((v) => !v)}
            className="flex h-11 w-full items-center justify-between px-1 text-left text-sm font-medium text-zinc-600"
            aria-expanded={showSubmitted}
          >
            <span>
              Odovzdané – čaká na kontrolu <span className="num text-zinc-400">({submitted.length})</span>
            </span>
            <ChevronDown size={18} strokeWidth={1.75} className={cn('text-zinc-400 transition-transform', showSubmitted && 'rotate-180')} />
          </button>
          {showSubmitted && (
            <ul className="mt-1 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {submitted.map((r) => (
                <li key={r.id}>
                  <Link to={`/portal/requests/${r.id}`} className="flex min-h-[52px] items-center gap-3 px-4 py-3 hover:bg-zinc-50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-700">{r.title}</span>
                      <span className="block text-xs text-zinc-400">Účtovníčka to skontroluje</span>
                    </span>
                    <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-zinc-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {resolved.length > 0 && (
        <Link
          to="/portal/uploads"
          className={cn('flex h-11 items-center justify-between px-1 text-sm text-zinc-500 hover:text-zinc-800', submitted.length === 0 && 'mt-7')}
        >
          <span>
            Vybavené: <span className="num">{resolved.length}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-zinc-500">
            Odovzdané doklady
            <ChevronRight size={16} strokeWidth={1.75} />
          </span>
        </Link>
      )}
    </div>
  )
}

function OpenRequestCard({ r, today }: { r: Request; today: string }) {
  const due = dueInfo(r, today)
  const action = r.type === 'document' ? 'Nahrať doklad' : 'Odpovedať'
  return (
    <Link
      to={`/portal/requests/${r.id}`}
      className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 active:bg-zinc-50"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-zinc-500">{TYPE_HINT[r.type]}</span>
        <span className={cn('num', due.overdue ? 'font-medium text-red-600' : 'text-zinc-500')}>
          {due.overdue ? `po termíne (${formatShortDate(r.dueDate)})` : due.label}
        </span>
      </div>
      <h2 className="mt-1.5 text-[15px] font-semibold leading-snug text-zinc-900">{r.title}</h2>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-600">{r.description}</p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
        <span className="num text-xs text-zinc-400">{r.remindersSent > 0 ? `Pripomenuté ${r.remindersSent}×` : ''}</span>
        <span className="inline-flex h-9 items-center gap-1 rounded-lg bg-accent-600 px-3.5 text-sm font-medium text-white">
          {action}
          <ChevronRight size={16} strokeWidth={1.75} />
        </span>
      </div>
    </Link>
  )
}
