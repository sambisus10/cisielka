import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { useStore, clientPeriodProgress, isOverdue } from '../../store/AppStore'
import { Avatar, Button, Card, cn, DocumentStatusBadge, EmptyState, PageHeader, Tabs } from '../../components/ui'
import { NewRequestModal } from '../../components/NewRequestModal'
import { RequestsTable, sortRequests, TD, TH, Timeline } from '../../components/accountantShared'
import { formatDate, formatMoney } from '../../lib/format'

type Tab = 'requests' | 'documents' | 'history'

export default function ClientDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('requests')
  const [modal, setModal] = useState(false)

  const back = (
    <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
      <ArrowLeft size={14} strokeWidth={1.75} />
      Klienti
    </Link>
  )

  const c = state.clients.find((x) => x.id === id)
  if (!c) {
    return (
      <div>
        <div className="mb-3">{back}</div>
        <Card>
          <EmptyState title="Klient sa nenašiel" />
        </Card>
      </div>
    )
  }

  const requests = sortRequests(
    state.requests.filter((r) => r.clientId === c.id),
    state.today,
  )
  const docs = state.documents.filter((d) => d.clientId === c.id).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  const events = state.events.filter((e) => e.clientId === c.id).sort((a, b) => b.at.localeCompare(a.at))
  const open = requests.filter((r) => r.status !== 'resolved').length
  const overdue = requests.filter((r) => isOverdue(r, state.today)).length
  const toReview = docs.filter((d) => d.status === 'uploaded').length
  const p = clientPeriodProgress(state, c.id)

  const stats = [
    { label: 'Otvorené požiadavky', value: String(open) },
    { label: 'Po termíne', value: String(overdue), alert: overdue > 0 },
    { label: 'Uzávierka september', value: p.total ? `${p.done}/${p.total}` : '–' },
    { label: 'Doklady na kontrolu', value: String(toReview) },
  ]

  return (
    <div>
      <PageHeader
        back={back}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={c.name} />
            {c.name}
          </span>
        }
        description={`${c.legalForm === 'sro' ? 's.r.o.' : 'Živnostník'} · ${c.vatPayer ? 'platiteľ DPH' : 'neplatiteľ DPH'}${c.note ? ` · ${c.note}` : ''}`}
        actions={
          <Button variant="primary" onClick={() => setModal(true)}>
            <Plus size={15} strokeWidth={1.75} />
            Nová požiadavka
          </Button>
        }
      />

      <Card className="mb-4">
        <dl className="grid gap-x-6 gap-y-3 px-4 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Kontaktná osoba">{c.contactName}</Field>
          <Field label="Email">
            <span className="break-all">{c.email}</span>
          </Field>
          <Field label="Telefón">
            <span className="num">{c.phone}</span>
          </Field>
          <Field label="IČO / DIČ / IČ DPH">
            <span className="num">
              {c.ico} / {c.dic} / {c.icDph ?? '–'}
            </span>
          </Field>
        </dl>
        <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500">Klient sa prihlasuje cez odkaz z emailu – bez hesla.</p>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5">
            <div className="text-xs text-zinc-500">{s.label}</div>
            <div className={cn('num mt-0.5 text-lg font-semibold', s.alert ? 'text-red-600' : 'text-zinc-900')}>{s.value}</div>
          </div>
        ))}
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'requests', label: 'Požiadavky', count: requests.length },
          { value: 'documents', label: 'Doklady', count: docs.length },
          { value: 'history', label: 'História' },
        ]}
      />

      <Card className="mt-4">
        {tab === 'requests' &&
          (requests.length ? (
            <RequestsTable requests={requests} state={state} showClient={false} />
          ) : (
            <EmptyState
              title="Zatiaľ žiadne požiadavky"
              action={
                <Button variant="primary" onClick={() => setModal(true)}>
                  Nová požiadavka
                </Button>
              }
            />
          ))}

        {tab === 'documents' &&
          (docs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50/60">
                  <tr>
                    <th className={TH}>Súbor</th>
                    <th className={TH}>Dodávateľ</th>
                    <th className={TH}>Číslo</th>
                    <th className={cn(TH, 'text-right')}>Suma</th>
                    <th className={TH}>Stav</th>
                    <th className={TH}>Nahrané</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} onClick={() => navigate(`/documents/${d.id}`)} className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                      <td className={cn(TD, 'max-w-[240px]')}>
                        <Link to={`/documents/${d.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-zinc-900 hover:underline">
                          {d.fileName}
                        </Link>
                      </td>
                      <td className={cn(TD, 'max-w-[200px] truncate text-zinc-700')}>{d.data.supplierName || <span className="text-zinc-400">–</span>}</td>
                      <td className={cn(TD, 'num whitespace-nowrap text-zinc-700')}>{d.data.invoiceNumber || '–'}</td>
                      <td className={cn(TD, 'num whitespace-nowrap text-right text-zinc-900')}>{d.data.total ? formatMoney(d.data.total) : <span className="text-zinc-400">–</span>}</td>
                      <td className={TD}>
                        <DocumentStatusBadge status={d.status} />
                      </td>
                      <td className={cn(TD, 'num whitespace-nowrap text-xs text-zinc-500')}>{formatDate(d.uploadedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Žiadne doklady" description="Doklady sa tu objavia, keď ich klient nahrá k požiadavke." />
          ))}

        {tab === 'history' && <Timeline events={events} state={state} showRequest />}
      </Card>

      <NewRequestModal open={modal} onClose={() => setModal(false)} defaultClientId={c.id} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-900">{children}</dd>
    </div>
  )
}
