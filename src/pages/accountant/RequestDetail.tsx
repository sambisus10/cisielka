import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Paperclip } from 'lucide-react'
import DocPreview from '../../components/DocPreview'
import { useStore, requestDisplayStatus } from '../../store/AppStore'
import type { AppState, Request } from '../../data/types'
import { Avatar, Button, Card, CardHeader, cn, DocumentStatusBadge, EmptyState, Modal, REQUEST_TYPE_LABEL, RequestStatusBadge, Switch } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { addDays, formatDate, formatDateTime, formatFileSize, formatMoney, formatPeriod } from '../../lib/format'
import { DueCell, Timeline } from '../../components/accountantShared'

function nextPlanned(r: Request, state: AppState): { label: string; at: string } | null {
  if (r.status !== 'waiting_client' || !r.remindersEnabled) return null
  const { firstReminderDays, secondReminderDays, alertAccountantDays } = state.settings
  const base = r.createdAt.slice(0, 10) + 'T08:00'
  const tomorrow = addDays(state.today.slice(0, 10) + 'T08:00', 1)
  const clamp = (at: string) => (at.slice(0, 10) <= state.today.slice(0, 10) ? tomorrow : at)
  if (r.remindersSent < 2) {
    const days = r.remindersSent === 0 ? firstReminderDays : secondReminderDays
    return { label: `${r.remindersSent + 1}. pripomienka klientovi`, at: clamp(addDays(base, days)) }
  }
  if (!r.accountantAlerted) return { label: 'Upozornenie pre vás', at: clamp(addDays(base, alertAccountantDays)) }
  return null
}

export default function RequestDetail() {
  const { id } = useParams()
  const store = useStore()
  const { state } = store
  const toast = useToast()
  const [text, setText] = useState('')
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnText, setReturnText] = useState('')

  const r = state.requests.find((x) => x.id === id)
  const back = (
    <Link to="/requests" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
      <ArrowLeft size={14} strokeWidth={1.75} />
      Požiadavky
    </Link>
  )

  if (!r) {
    return (
      <div>
        <div className="mb-3">{back}</div>
        <Card>
          <EmptyState title="Požiadavka sa nenašla" description="Mohla byť odstránená, alebo je odkaz nesprávny." />
        </Card>
      </div>
    )
  }

  const client = state.clients.find((c) => c.id === r.clientId)
  const status = requestDisplayStatus(r, state.today)
  const docs = state.documents.filter((d) => r.documentIds.includes(d.id) || d.requestId === r.id)
  const comments = state.comments.filter((c) => c.requestId === r.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const events = state.events.filter((e) => e.requestId === r.id).sort((a, b) => a.at.localeCompare(b.at))
  const remindersTotal = events.filter((e) => e.type === 'reminder_sent').length
  const next = nextPlanned(r, state)
  const docName = (docId: string) => state.documents.find((d) => d.id === docId)?.fileName

  const send = () => {
    if (!text.trim()) return
    store.addComment(r.id, 'accountant', text.trim())
    setText('')
    toast('Správa odoslaná klientovi')
  }

  return (
    <div>
      <div className="mb-3">{back}</div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Ľavý stĺpec */}
        <div className="min-w-0 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <RequestStatusBadge status={status} />
              <span className="text-xs text-zinc-500">{REQUEST_TYPE_LABEL[r.type]}</span>
              {r.period && <span className="text-xs text-zinc-400">· obdobie {formatPeriod(r.period)}</span>}
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{r.title}</h1>
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Klient</dt>
                <dd>
                  {client ? (
                    <Link to={`/clients/${client.id}`} className="font-medium text-zinc-900 hover:underline">
                      {client.name}
                    </Link>
                  ) : (
                    '–'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Termín</dt>
                <dd>
                  <DueCell r={r} today={state.today} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Vytvorené</dt>
                <dd className="num text-zinc-800">{formatDateTime(r.createdAt)}</dd>
              </div>
              {r.resolvedAt && (
                <div>
                  <dt className="text-xs text-zinc-500">Vyriešené</dt>
                  <dd className="num text-zinc-800">{formatDateTime(r.resolvedAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          <Card className="px-4 py-3">
            <p className="mb-1 text-xs font-medium text-zinc-500">Zadanie pre klienta</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-800">{r.description}</p>
            {r.amount !== undefined && (
              <p className="mt-2 text-sm text-zinc-600">
                Suma: <span className="num font-medium text-zinc-900">{formatMoney(r.amount)}</span>
              </p>
            )}
          </Card>

          <Card>
            <CardHeader title={`Doklady (${docs.length})`} />
            {docs.length === 0 ? (
              <p className="px-4 py-5 text-sm text-zinc-500">Klient zatiaľ nič nenahral.</p>
            ) : (
              <ul>
                {docs.map((d) => (
                  <li key={d.id} className="border-b border-zinc-100 last:border-0">
                    <Link to={`/documents/${d.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50">
                      <span className="block w-7 shrink-0">
                        <DocPreview doc={d} compact />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-900">{d.fileName}</span>
                        <span className="num block text-xs text-zinc-500">
                          {formatFileSize(d.fileSize)} · nahrané {formatDateTime(d.uploadedAt)}
                        </span>
                      </span>
                      <DocumentStatusBadge status={d.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Komunikácia s klientom" description="Správy sa klientovi posielajú emailom" />
            <div className="space-y-4 px-4 py-4">
              {comments.length === 0 && <p className="text-sm text-zinc-500">Zatiaľ žiadne správy.</p>}
              {comments.map((c) => {
                const mine = c.author === 'accountant'
                return (
                  <div key={c.id} className={cn('flex gap-2.5', mine && 'flex-row-reverse')}>
                    {!mine && <Avatar name={client?.contactName ?? 'K'} size="sm" />}
                    <div className={cn('max-w-[85%] sm:max-w-[75%]', mine && 'text-right')}>
                      <p className="mb-1 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-700">{mine ? 'Vy' : client?.contactName}</span>
                        <span className="num"> · {formatDateTime(c.createdAt)}</span>
                      </p>
                      <div
                        className={cn(
                          'inline-block rounded-lg border px-3 py-2 text-left text-sm leading-relaxed',
                          mine ? 'border-accent-100 bg-accent-50 text-zinc-800' : 'border-zinc-200 bg-white text-zinc-800',
                        )}
                      >
                        <p className="whitespace-pre-line">{c.text}</p>
                        {!!c.documentIds?.length && (
                          <ul className="mt-2 space-y-0.5 border-t border-zinc-100 pt-2">
                            {c.documentIds.map((did) => (
                              <li key={did}>
                                <Link to={`/documents/${did}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 hover:underline">
                                  <Paperclip size={12} strokeWidth={1.75} />
                                  {docName(did) ?? 'odstránený doklad'}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-zinc-200 p-3">
              <textarea
                className="input min-h-[72px] resize-y"
                placeholder="Napíšte správu klientovi…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-400">Ctrl + Enter odošle</span>
                <Button variant="primary" size="sm" onClick={send} disabled={!text.trim()}>
                  Odoslať
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Pravý stĺpec */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Akcie" />
            <div className="space-y-2 p-3">
              {r.status === 'waiting_accountant' && (
                <>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      store.resolveRequest(r.id)
                      toast('Požiadavka označená ako vyriešená')
                    }}
                  >
                    Označiť ako vyriešené
                  </Button>
                  <Button className="w-full" onClick={() => setReturnOpen(true)}>
                    Vrátiť klientovi
                  </Button>
                </>
              )}
              {r.status === 'waiting_client' && (
                <>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      store.remindNow(r.id)
                      toast(`Pripomienka odoslaná na ${client?.email ?? 'email klienta'}`)
                    }}
                  >
                    Pripomenúť teraz
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      store.resolveRequest(r.id)
                      toast('Požiadavka označená ako vyriešená')
                    }}
                  >
                    Označiť ako vyriešené
                  </Button>
                </>
              )}
              {r.status === 'resolved' && (
                <Button
                  className="w-full"
                  onClick={() => {
                    store.reopenRequest(r.id)
                    toast('Požiadavka znovu otvorená')
                  }}
                >
                  Znovu otvoriť
                </Button>
              )}
              <p className="pt-1 text-xs leading-relaxed text-zinc-500">
                {r.status === 'waiting_accountant' && 'Klient odovzdal podklady. Skontrolujte ich a požiadavku uzavrite, alebo ju vráťte s komentárom.'}
                {r.status === 'waiting_client' && 'Čakáte na klienta. Pripomienky chodia automaticky, ručne môžete pripomenúť kedykoľvek.'}
                {r.status === 'resolved' && 'Požiadavka je uzavretá. Klient dostal potvrdenie.'}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pripomienky" />
            <dl className="divide-y divide-zinc-100 text-sm">
              <Row label="Automatické">
                <span className="flex h-5 items-center">
                  <Switch
                    checked={r.remindersEnabled}
                    label="Automatické pripomienky"
                    onChange={(v) => {
                      store.setRemindersEnabled(r.id, v)
                      toast(v ? 'Automatické pripomienky zapnuté' : 'Automatické pripomienky vypnuté')
                    }}
                  />
                </span>
              </Row>
              <Row label="Odoslané">
                <span className="num text-zinc-900">{remindersTotal}</span>
              </Row>
              <Row label="Posledná">
                <span className="num text-zinc-900">{r.lastReminderAt ? formatDateTime(r.lastReminderAt) : '–'}</span>
              </Row>
              <Row label="Ďalšia">
                {next ? (
                  <span className="text-right">
                    <span className="num block text-zinc-900">{formatDate(next.at)}</span>
                    <span className="block text-xs text-zinc-500">{next.label}</span>
                  </span>
                ) : (
                  <span className="text-zinc-400">{r.status === 'waiting_client' && r.accountantAlerted ? 'upozornenie odoslané' : '–'}</span>
                )}
              </Row>
            </dl>
          </Card>

          <Card>
            <CardHeader title="História" />
            <Timeline events={events} state={state} />
          </Card>
        </div>
      </div>

      <Modal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title="Vrátiť klientovi"
        description="Klient dostane email s vaším komentárom a požiadavka sa vráti do stavu Čaká na klienta."
        footer={
          <>
            <Button onClick={() => setReturnOpen(false)}>Zrušiť</Button>
            <Button
              variant="primary"
              disabled={!returnText.trim()}
              onClick={() => {
                store.reopenRequest(r.id, returnText.trim())
                setReturnText('')
                setReturnOpen(false)
                toast('Požiadavka vrátená klientovi')
              }}
            >
              Vrátiť klientovi
            </Button>
          </>
        }
      >
        <label className="label" htmlFor="return-text">
          Čo treba doplniť
        </label>
        <textarea
          id="return-text"
          className="input min-h-[96px]"
          autoFocus
          placeholder="napr. Na faktúre chýba druhá strana, nahrajte ju prosím celú."
          value={returnText}
          onChange={(e) => setReturnText(e.target.value)}
        />
      </Modal>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
