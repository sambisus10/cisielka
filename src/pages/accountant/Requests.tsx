import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useStore, isOverdue } from '../../store/AppStore'
import type { Request } from '../../data/types'
import { Button, Card, EmptyState, PageHeader, Tabs } from '../../components/ui'
import { NewRequestModal } from '../../components/NewRequestModal'
import { RequestsTable, sortRequests } from '../../components/accountantShared'

type Filter = 'all' | 'waiting_accountant' | 'waiting_client' | 'overdue' | 'resolved'
const FILTERS: Filter[] = ['all', 'waiting_accountant', 'waiting_client', 'overdue', 'resolved']

export default function Requests() {
  const { state } = useStore()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)

  const raw = params.get('status') as Filter | null
  const filter: Filter = raw && FILTERS.includes(raw) ? raw : 'all'
  const clientId = params.get('client') ?? ''

  const setParam = (key: string, value: string, empty: string) => {
    const next = new URLSearchParams(params)
    if (value === empty) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const match = (r: Request, f: Filter) => {
    if (f === 'all') return true
    if (f === 'overdue') return isOverdue(r, state.today)
    return r.status === f
  }

  const base = useMemo(() => {
    const t = q.trim().toLowerCase()
    return state.requests.filter((r) => {
      if (clientId && r.clientId !== clientId) return false
      if (!t) return true
      const client = state.clients.find((c) => c.id === r.clientId)
      return [r.title, r.description, client?.name, client?.contactName].some((x) => x?.toLowerCase().includes(t))
    })
  }, [state, q, clientId])

  const count = (f: Filter) => base.filter((r) => match(r, f)).length
  const rows = sortRequests(
    base.filter((r) => match(r, filter)),
    state.today,
  )

  return (
    <div>
      <PageHeader
        title="Požiadavky"
        description="Čo ste od klientov pýtali a v akom je to stave"
        actions={
          <Button variant="primary" onClick={() => setModal(true)}>
            <Plus size={15} strokeWidth={1.75} />
            Nová požiadavka
          </Button>
        }
      />

      <Tabs<Filter>
        value={filter}
        onChange={(v) => setParam('status', v, 'all')}
        items={[
          { value: 'all', label: 'Všetky', count: count('all') },
          { value: 'waiting_accountant', label: 'Čaká na mňa', count: count('waiting_accountant') },
          { value: 'waiting_client', label: 'Čaká na klienta', count: count('waiting_client') },
          { value: 'overdue', label: 'Po termíne', count: count('overdue') },
          { value: 'resolved', label: 'Vyriešené', count: count('resolved') },
        ]}
      />

      <div className="my-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-8" placeholder="Hľadať v požiadavkách…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto min-w-[200px]" value={clientId} onChange={(e) => setParam('client', e.target.value, '')}>
          <option value="">Všetci klienti</option>
          {state.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {(q || clientId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ('')
              setParam('client', '', '')
            }}
          >
            Zrušiť filtre
          </Button>
        )}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="Žiadne požiadavky"
            description={filter === 'waiting_accountant' ? 'Momentálne na vás nič nečaká.' : 'Pre zvolený filter sa nič nenašlo.'}
          />
        ) : (
          <RequestsTable requests={rows} state={state} />
        )}
      </Card>

      <NewRequestModal open={modal} onClose={() => setModal(false)} defaultClientId={clientId || undefined} />
    </div>
  )
}
