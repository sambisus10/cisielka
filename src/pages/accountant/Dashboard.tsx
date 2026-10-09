import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { useStore, clientPeriodProgress, isOverdue, lastClientActivity } from '../../store/AppStore'
import { Button, Card, CardHeader, cn, PageHeader, REQUEST_TYPE_LABEL } from '../../components/ui'
import { NewRequestModal } from '../../components/NewRequestModal'
import { formatDate, formatDateTime, formatPeriod, plural, relativeDays } from '../../lib/format'
import { ProgressBar, TD, TH } from '../../components/accountantShared'

const WEEKDAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota']
const PERIOD = '2026-09'

export default function Dashboard() {
  const { state } = useStore()
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)
  const { today } = state

  const [y, m, d] = today.slice(0, 10).split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  const hour = Number(today.slice(11, 13))
  const greeting = hour < 10 ? 'Dobré ráno' : 'Dobrý deň'

  const waitingMe = state.requests.filter((r) => r.status === 'waiting_accountant')
  const waitingClient = state.requests.filter((r) => r.status === 'waiting_client')
  const overdue = state.requests.filter((r) => isOverdue(r, today))
  const toReview = state.documents.filter((d) => d.status === 'uploaded')

  const kpis = [
    { label: 'Čaká na mňa', value: waitingMe.length, hint: 'klient odovzdal, treba skontrolovať', to: '/requests?status=waiting_accountant' },
    { label: 'Čaká na klienta', value: waitingClient.length, hint: 'odoslané, bez odpovede', to: '/requests?status=waiting_client' },
    { label: 'Po termíne', value: overdue.length, hint: 'klient nestihol termín', to: '/requests?status=overdue', alert: overdue.length > 0 },
    { label: 'Doklady na kontrolu', value: toReview.length, hint: 'nahrané, neskontrolované', to: '/documents' },
  ]

  const clientRows = state.clients.map((c) => {
    const reqs = state.requests.filter((r) => r.clientId === c.id)
    return {
      client: c,
      progress: clientPeriodProgress(state, c.id, PERIOD),
      open: reqs.filter((r) => r.status !== 'resolved').length,
      overdue: reqs.filter((r) => isOverdue(r, today)).length,
      last: lastClientActivity(state, c.id),
    }
  })

  const clientName = (id: string) => state.clients.find((c) => c.id === id)?.name ?? ''
  const submittedAt = (requestId: string) =>
    state.events.filter((e) => e.requestId === requestId && e.actor === 'client').reduce((a, e) => (e.at > a ? e.at : a), '')

  const waitingList = [...waitingMe].sort((a, b) => (submittedAt(b.id) || b.createdAt).localeCompare(submittedAt(a.id) || a.createdAt)).slice(0, 6)
  const recent = [...state.events].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${state.accountant.firstName}`}
        description={
          <>
            <span className="capitalize">{weekday}</span> <span className="num">{formatDate(today)}</span> · prebieha uzávierka za {formatPeriod(PERIOD)}, DPH do 25. 10.
          </>
        }
        actions={
          <Button variant="primary" onClick={() => setModal(true)}>
            <Plus size={15} strokeWidth={1.75} />
            Nová požiadavka
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to} className="group rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              {k.label}
              <ChevronRight size={14} strokeWidth={1.75} className="text-zinc-300 group-hover:text-zinc-500" />
            </div>
            <div className={cn('num mt-1 text-2xl font-semibold tracking-tight', k.alert ? 'text-red-600' : 'text-zinc-900')}>{k.value}</div>
            <div className="mt-0.5 truncate text-xs text-zinc-500">{k.hint}</div>
          </Link>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader
          title={`Uzávierka – ${formatPeriod(PERIOD)}`}
          description="Koľko požiadaviek za obdobie klient už vybavil"
          actions={
            <Link to="/clients" className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
              Všetci klienti
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/60">
              <tr>
                <th className={TH}>Klient</th>
                <th className={TH}>Stav uzávierky</th>
                <th className={cn(TH, 'text-right')}>Otvorené</th>
                <th className={TH}>Po termíne</th>
                <th className={TH}>Posledná aktivita</th>
              </tr>
            </thead>
            <tbody>
              {clientRows.map(({ client, progress, open, overdue, last }) => (
                <tr key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                  <td className={TD}>
                    <div className="font-medium text-zinc-900">{client.name}</div>
                    <div className="text-xs text-zinc-500">{client.legalForm === 'sro' ? 's.r.o.' : 'živnostník'}</div>
                  </td>
                  <td className={TD}>
                    <ProgressBar done={progress.done} total={progress.total} />
                  </td>
                  <td className={cn(TD, 'num text-right text-zinc-700')}>{open || <span className="text-zinc-400">0</span>}</td>
                  <td className={TD}>
                    {overdue ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {plural(overdue, 'požiadavka', 'požiadavky', 'požiadaviek')}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">–</span>
                    )}
                  </td>
                  <td className={cn(TD, 'whitespace-nowrap text-xs text-zinc-500')} title={last ? formatDateTime(last.at) : undefined}>
                    {last ? relativeDays(last.at, today) : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Čaká na mňa"
            description="Klient odovzdal, je na vás rad"
            actions={
              <Link to="/requests?status=waiting_accountant" className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
                Zobraziť všetky
              </Link>
            }
          />
          {waitingList.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">Všetko vybavené. Nič nečaká na vás.</p>
          ) : (
            <ul>
              {waitingList.map((r) => {
                const at = submittedAt(r.id) || r.createdAt
                return (
                  <li key={r.id} className="border-b border-zinc-100 last:border-0">
                    <Link to={`/requests/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-zinc-900">{r.title}</span>
                        <span className="block truncate text-xs text-zinc-500">
                          {clientName(r.clientId)} · {REQUEST_TYPE_LABEL[r.type]}
                          {r.documentIds.length > 0 && ` · ${plural(r.documentIds.length, 'doklad', 'doklady', 'dokladov')}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">{relativeDays(at, today)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Najnovšia aktivita" />
          <ul>
            {recent.map((e) => (
              <li key={e.id} className="border-b border-zinc-100 last:border-0">
                <Link
                  to={e.requestId ? `/requests/${e.requestId}` : e.documentId ? `/documents/${e.documentId}` : `/clients/${e.clientId}`}
                  className="flex items-baseline justify-between gap-3 px-4 py-2 hover:bg-zinc-50"
                >
                  <span className="min-w-0 truncate text-sm text-zinc-700">
                    <span className="font-medium text-zinc-900">{clientName(e.clientId)}</span>
                    <span className="text-zinc-400"> · </span>
                    {e.text}
                  </span>
                  <span className="num shrink-0 text-xs text-zinc-500">{relativeDays(e.at, today) === 'dnes' ? e.at.slice(11, 16) : relativeDays(e.at, today)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <NewRequestModal open={modal} onClose={() => setModal(false)} />
    </div>
  )
}
