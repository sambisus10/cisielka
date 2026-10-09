import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useStore } from '../../store/AppStore'
import type { ClientMessage } from '../../data/types'
import { cn, EmptyState } from '../../components/ui'
import { formatDateTime, formatShortDate } from '../../lib/format'
import { bigPrimary } from './shared'

const KIND_LABEL: Record<ClientMessage['kind'], string> = {
  new_request: 'Nová požiadavka',
  reminder: 'Pripomienka',
  comment: 'Správa od účtovníčky',
  resolved: 'Vybavené',
}

export default function ClientMessages() {
  const { state, markClientMessagesRead } = useStore()
  const clientId = state.portalClientId
  const client = state.clients.find((c) => c.id === clientId)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Neprečítané bodky necháme chvíľu viditeľné, potom správy označíme ako prečítané
  useEffect(() => {
    const t = setTimeout(() => markClientMessagesRead(clientId), 2000)
    return () => clearTimeout(t)
  }, [clientId, markClientMessagesRead])

  const messages = state.clientMessages.filter((m) => m.clientId === clientId).sort((a, b) => b.at.localeCompare(a.at))

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div>
      <div className="px-1 pb-4 pt-2">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">Správy</h1>
        <p className="mt-1 text-sm text-zinc-500">Takto vyzerajú emaily, ktoré vám posiela portál.</p>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <EmptyState title="Žiadne správy" description="Keď vám účtovníčka niečo pošle, uvidíte to tu aj v emaile." />
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {messages.map((m) => {
            const open = expanded.has(m.id)
            return (
              <li key={m.id}>
                <button type="button" onClick={() => toggle(m.id)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-zinc-50" aria-expanded={open}>
                  <span className="mt-1.5 flex h-2 w-2 shrink-0">{!m.read && <span className="h-2 w-2 rounded-full bg-accent-600" aria-label="Neprečítané" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3 text-xs">
                      <span className={cn('font-medium', m.kind === 'reminder' ? 'text-amber-700' : 'text-zinc-500')}>{KIND_LABEL[m.kind]}</span>
                      <span className="num shrink-0 text-zinc-400">{formatShortDate(m.at)}</span>
                    </span>
                    <span className={cn('mt-0.5 block text-sm', !m.read ? 'font-semibold text-zinc-900' : 'text-zinc-800', !open && 'truncate')}>{m.subject}</span>
                  </span>
                  <ChevronDown size={16} strokeWidth={1.75} className={cn('mt-4 shrink-0 text-zinc-300 transition-transform', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="px-4 pb-4">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60">
                      <dl className="space-y-0.5 border-b border-zinc-200 px-3.5 py-2.5 text-xs text-zinc-500">
                        <div className="flex gap-1.5">
                          <dt className="w-8 shrink-0">Od:</dt>
                          <dd className="min-w-0 truncate text-zinc-700">
                            {state.accountant.office} &lt;{state.accountant.email}&gt;
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="w-8 shrink-0">Pre:</dt>
                          <dd className="min-w-0 truncate text-zinc-700">{client?.email}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="w-8 shrink-0" />
                          <dd className="num">{formatDateTime(m.at)}</dd>
                        </div>
                      </dl>
                      <div className="px-3.5 py-3">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-800">{m.body}</p>
                        {m.requestId && (
                          <Link to={`/portal/requests/${m.requestId}`} className={cn(bigPrimary, 'mt-4')}>
                            Otvoriť požiadavku
                          </Link>
                        )}
                        <p className="mt-4 text-[11px] leading-snug text-zinc-400">
                          {state.accountant.office} · Odkaz funguje bez prihlasovania.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
