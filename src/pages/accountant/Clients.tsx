import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useStore, clientPeriodProgress, isOverdue } from '../../store/AppStore'
import { Avatar, Card, cn, EmptyState, PageHeader } from '../../components/ui'
import { ProgressBar, TD, TH } from '../../components/accountantShared'

export default function Clients() {
  const { state } = useStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const t = q.trim().toLowerCase()
  const clients = state.clients.filter((c) => !t || [c.name, c.contactName, c.ico, c.email].some((x) => x.toLowerCase().includes(t)))

  return (
    <div>
      <PageHeader title="Klienti" description={`${state.clients.length} klientov v kancelárii`} />

      <div className="mb-4 relative w-full max-w-xs">
        <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input className="input pl-8" placeholder="Hľadať meno, IČO, email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card>
        {clients.length === 0 ? (
          <EmptyState title="Nič sa nenašlo" description="Skúste hľadať podľa IČO alebo mena kontaktnej osoby." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/60">
                <tr>
                  <th className={TH}>Klient</th>
                  <th className={TH}>IČO</th>
                  <th className={TH}>Forma</th>
                  <th className={TH}>Platiteľ DPH</th>
                  <th className={TH}>Uzávierka september</th>
                  <th className={cn(TH, 'text-right')}>Otvorené</th>
                  <th className={TH}>Kontakt</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const reqs = state.requests.filter((r) => r.clientId === c.id)
                  const open = reqs.filter((r) => r.status !== 'resolved').length
                  const overdue = reqs.filter((r) => isOverdue(r, state.today)).length
                  const p = clientPeriodProgress(state, c.id)
                  return (
                    <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                      <td className={TD}>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.name} />
                          <div className="min-w-0">
                            <Link to={`/clients/${c.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-zinc-900 hover:underline">
                              {c.name}
                            </Link>
                            {c.contactName !== c.name && <div className="truncate text-xs text-zinc-500">{c.contactName}</div>}
                          </div>
                        </div>
                      </td>
                      <td className={cn(TD, 'num text-zinc-700')}>{c.ico}</td>
                      <td className={cn(TD, 'whitespace-nowrap text-zinc-700')}>{c.legalForm === 'sro' ? 's.r.o.' : 'živnostník'}</td>
                      <td className={cn(TD, c.vatPayer ? 'text-zinc-700' : 'text-zinc-400')}>{c.vatPayer ? 'áno' : 'nie'}</td>
                      <td className={TD}>
                        <ProgressBar done={p.done} total={p.total} />
                      </td>
                      <td className={cn(TD, 'whitespace-nowrap text-right')}>
                        <span className="num text-zinc-700">{open}</span>
                        {overdue > 0 && <span className="ml-1.5 text-xs text-red-600">({overdue} po termíne)</span>}
                      </td>
                      <td className={cn(TD, 'text-xs text-zinc-600')}>{c.email}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
