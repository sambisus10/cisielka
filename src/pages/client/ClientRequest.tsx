import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Camera, Check, ChevronLeft, Loader2, Paperclip, Send, Upload, X } from 'lucide-react'
import { requestDisplayStatus, useStore } from '../../store/AppStore'
import type { Comment, Document } from '../../data/types'
import { cn, EmptyState, RequestStatusBadge } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { formatDate, formatDateTime, formatFileSize, formatShortDate, plural } from '../../lib/format'
import { bigPrimary, bigSecondary, dueInfo, FileThumb } from './shared'

export default function ClientRequest() {
  const { id = '' } = useParams()
  const { state, uploadFiles, removeDocument, submitRequest, addComment } = useStore()
  const toast = useToast()
  const r = state.requests.find((x) => x.id === id && x.clientId === state.portalClientId)

  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [done, setDone] = useState<null | { files: number; text: boolean }>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    setDone(null)
    setText('')
  }, [id])

  const comments = useMemo(
    () => state.comments.filter((c) => c.requestId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.comments, id],
  )
  const docs = state.documents.filter((d) => d.requestId === id)
  const docById = (docId: string) => state.documents.find((d) => d.id === docId)
  /** Súbory nahrané, ale ešte neodovzdané (nie sú pripojené k žiadnej správe) */
  const attached = new Set(comments.flatMap((c) => c.documentIds ?? []))
  const pending = docs.filter((d) => d.uploadedBy === 'client' && d.status === 'uploaded' && !attached.has(d.id))

  if (!r) {
    return (
      <div>
        <BackLink />
        <EmptyState title="Požiadavka sa nenašla" description="Možno ju účtovníčka medzitým zrušila." />
      </div>
    )
  }

  const isDocument = r.type === 'document'
  const canSubmit = !uploading && (pending.length > 0 || text.trim().length > 0)
  const due = dueInfo(r, state.today)

  const handleFiles = async (list: FileList | null) => {
    const files = list ? Array.from(list) : []
    if (!files.length) return
    setUploading(true)
    try {
      await uploadFiles(r.id, files)
    } finally {
      setUploading(false)
    }
  }
  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files)
    e.target.value = ''
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    void handleFiles(e.dataTransfer.files)
  }
  const onSubmit = () => {
    if (!canSubmit) return
    const t = text.trim()
    submitRequest(r.id, t || undefined)
    setDone({ files: pending.length, text: !!t })
    setText('')
    window.scrollTo(0, 0)
  }

  const hiddenInputs = (
    <>
      <input ref={fileInput} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={onInput} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onInput} />
    </>
  )

  /* ---------- Úspešne odovzdané ---------- */
  if (done) {
    return (
      <div>
        <BackLink />
        <h1 className="px-1 text-xl font-semibold tracking-tight text-zinc-900">{r.title}</h1>
        <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-[17px] font-semibold text-zinc-900">Hotovo, ďakujeme.</p>
          <ul className="mt-4 space-y-3">
            <DoneRow label={done.files ? `Nahrané (${plural(done.files, 'súbor', 'súbory', 'súborov')})` : 'Odpoveď uložená'} />
            <DoneRow label="Odovzdané účtovníčke" />
          </ul>
          <p className="mt-4 text-sm text-zinc-600">
            {state.accountant.firstName} si to pozrie. Ak bude treba niečo doplniť, príde vám email.
          </p>
        </div>
        <Link to="/portal" className={cn(bigPrimary, 'mt-5')}>
          Späť na požiadavky
        </Link>
      </div>
    )
  }

  const status = requestDisplayStatus(r, state.today)
  const editable = r.status === 'waiting_client'

  return (
    <div className={cn(editable && 'pb-20')}>
      <BackLink />

      <div className="px-1">
        <div className="flex items-center gap-2">
          <RequestStatusBadge status={status} audience="client" />
          {editable && (
            <span className={cn('num text-xs', due.overdue ? 'font-medium text-red-600' : 'text-zinc-500')}>
              Termín {formatDate(r.dueDate)}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-zinc-900">{r.title}</h1>
      </div>

      {/* Správa od účtovníčky */}
      <div className="mt-4">
        <p className="mb-1 px-1 text-xs text-zinc-500">
          <span className="font-medium text-zinc-700">{state.accountant.name}</span>, vaša účtovníčka ·{' '}
          <span className="num">{formatShortDate(r.createdAt)}</span>
        </p>
        <div className="rounded-xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-zinc-800">
          {r.description}
        </div>
      </div>

      {editable ? (
        <div className="mt-6 space-y-5">
          {hiddenInputs}
          {isDocument ? (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={cn(
                    'flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
                    dragOver ? 'border-accent-500 bg-accent-50' : 'border-zinc-300 bg-white hover:border-zinc-400',
                  )}
                >
                  {uploading ? (
                    <Loader2 size={22} strokeWidth={1.75} className="animate-spin text-zinc-400" />
                  ) : (
                    <Upload size={22} strokeWidth={1.75} className="text-zinc-400" />
                  )}
                  <span className="mt-2 text-[15px] font-medium text-zinc-900">{uploading ? 'Nahrávam…' : 'Vybrať súbory'}</span>
                  <span className="mt-0.5 text-xs text-zinc-500">Fotky alebo PDF, aj viac naraz</span>
                </button>
                <button type="button" onClick={() => cameraInput.current?.click()} className={cn(bigSecondary, 'mt-2')}>
                  <Camera size={18} strokeWidth={1.75} />
                  Odfotiť doklad
                </button>
              </div>
              <PendingFiles docs={pending} onRemove={removeDocument} />
              <label className="block">
                <span className="mb-1.5 block px-1 text-sm font-medium text-zinc-700">Poznámka pre účtovníčku (nepovinné)</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={2}
                  placeholder="Napr. druhá strana je na ďalšej fotke"
                  className="block w-full resize-none rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
              </label>
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block px-1 text-sm font-medium text-zinc-700">Vaša odpoveď</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder="Napíšte odpoveď vlastnými slovami"
                  className="block w-full resize-none rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
              </label>
              <div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileInput.current?.click()} className={cn(bigSecondary, 'flex-1')} disabled={uploading}>
                    {uploading ? <Loader2 size={18} strokeWidth={1.75} className="animate-spin" /> : <Paperclip size={18} strokeWidth={1.75} />}
                    Priložiť súbor
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInput.current?.click()}
                    className={cn(bigSecondary, 'w-auto px-3.5')}
                    aria-label="Odfotiť doklad"
                    title="Odfotiť doklad"
                  >
                    <Camera size={18} strokeWidth={1.75} />
                  </button>
                </div>
                <div className="mt-3">
                  <PendingFiles docs={pending} onRemove={removeDocument} />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <SubmittedSummary status={r.status} resolvedAt={r.resolvedAt} comments={comments} docs={docs} accountantFirstName={state.accountant.firstName} />
      )}

      <Thread comments={comments} docById={docById} accountantName={state.accountant.name} onSend={(t) => {
        addComment(r.id, 'client', t)
        toast('Správa odoslaná účtovníčke')
      }} />

      {editable && (
        <div className="fixed bottom-[58px] left-1/2 z-10 w-full max-w-[420px] -translate-x-1/2 border-t border-zinc-200 bg-white/95 px-4 pb-3 pt-3 sm:absolute">
          <button type="button" onClick={onSubmit} disabled={!canSubmit} className={bigPrimary}>
            Odovzdať účtovníčke
          </button>
          {!canSubmit && !uploading && (
            <p className="mt-1.5 text-center text-xs text-zinc-400">{isDocument ? 'Najprv nahrajte doklad' : 'Najprv napíšte odpoveď'}</p>
          )}
        </div>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/portal" className="-ml-1 mb-3 inline-flex h-10 items-center gap-1 pr-3 text-sm text-zinc-500 hover:text-zinc-900">
      <ChevronLeft size={18} strokeWidth={1.75} />
      Požiadavky
    </Link>
  )
}

function DoneRow({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 text-[15px] text-zinc-800">
      <Check size={20} strokeWidth={2} className="shrink-0 text-accent-600" />
      {label}
    </li>
  )
}

function PendingFiles({ docs, onRemove }: { docs: Document[]; onRemove: (id: string) => void }) {
  if (!docs.length) return null
  return (
    <div>
      <p className="mb-1.5 px-1 text-sm font-medium text-zinc-700">
        Pripravené na odovzdanie <span className="num font-normal text-zinc-400">({docs.length})</span>
      </p>
      <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2.5 pl-3 pr-1.5">
            <FileThumb doc={d} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-zinc-900">{d.fileName}</span>
              <span className="num block text-xs text-zinc-500">{formatFileSize(d.fileSize)}</span>
            </span>
            {d.status === 'uploaded' && (
              <button
                type="button"
                onClick={() => onRemove(d.id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label={`Odstrániť ${d.fileName}`}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SubmittedSummary({
  status,
  resolvedAt,
  comments,
  docs,
  accountantFirstName,
}: {
  status: 'waiting_accountant' | 'resolved' | 'waiting_client'
  resolvedAt?: string
  comments: Comment[]
  docs: Document[]
  accountantFirstName: string
}) {
  const lastClient = [...comments].reverse().find((c) => c.author === 'client')
  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-3">
        <p className="text-sm font-medium text-zinc-900">
          {status === 'resolved' ? 'Vybavené, nič ďalšie netreba.' : `Odovzdané. ${accountantFirstName} to skontroluje.`}
        </p>
        <p className="num mt-0.5 text-xs text-zinc-500">
          {lastClient && `Odovzdali ste ${formatDate(lastClient.createdAt)}`}
          {status === 'resolved' && resolvedAt && `${lastClient ? ' · ' : ''}vybavené ${formatDate(resolvedAt)}`}
        </p>
      </div>
      {docs.length > 0 ? (
        <ul className="divide-y divide-zinc-100">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileThumb doc={d} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">{d.fileName}</span>
              <span className="num shrink-0 text-xs text-zinc-400">{formatFileSize(d.fileSize)}</span>
            </li>
          ))}
        </ul>
      ) : (
        lastClient && <p className="px-4 py-3 text-sm text-zinc-700">„{lastClient.text}“</p>
      )}
    </div>
  )
}

function Thread({
  comments,
  docById,
  accountantName,
  onSend,
}: {
  comments: Comment[]
  docById: (id: string) => Document | undefined
  accountantName: string
  onSend: (text: string) => void
}) {
  const [msg, setMsg] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = msg.trim()
    if (!t) return
    onSend(t)
    setMsg('')
  }
  return (
    <section className="mt-8">
      <h2 className="mb-2 px-1 text-sm font-medium text-zinc-700">Správy k požiadavke</h2>
      {comments.length > 0 ? (
        <ul className="space-y-2.5">
          {comments.map((c) => {
            const mine = c.author === 'client'
            const files = (c.documentIds ?? []).map(docById).filter((d): d is Document => !!d)
            return (
              <li key={c.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                    mine ? 'rounded-br-sm bg-accent-50 text-zinc-900 ring-1 ring-inset ring-accent-200/70' : 'rounded-bl-sm border border-zinc-200 bg-white text-zinc-800',
                  )}
                >
                  {c.text}
                  {files.length > 0 && (
                    <span className="mt-1.5 flex flex-col gap-1">
                      {files.map((d) => (
                        <span key={d.id} className="flex items-center gap-1.5 text-xs text-zinc-600">
                          <Paperclip size={12} strokeWidth={1.75} className="shrink-0" />
                          <span className="truncate">{d.fileName}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                <span className="num mt-0.5 px-1 text-[11px] text-zinc-400">
                  {mine ? 'Vy' : accountantName.split(' ')[0]} · {formatDateTime(c.createdAt)}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-1 text-sm text-zinc-500">Ak niečomu nerozumiete, napíšte účtovníčke.</p>
      )}
      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Napísať správu…"
          className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3.5 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
        />
        <button
          type="submit"
          disabled={!msg.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:text-zinc-300"
          aria-label="Odoslať správu"
        >
          <Send size={18} strokeWidth={1.75} />
        </button>
      </form>
    </section>
  )
}
