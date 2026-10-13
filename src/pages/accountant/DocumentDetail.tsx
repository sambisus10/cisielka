import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, RotateCcw } from 'lucide-react'
import type { Document, DocumentKind, InvoiceData } from '../../data/types'
import { useStore } from '../../store/AppStore'
import { useToast } from '../../components/Toast'
import { DocPreview } from '../../components/DocPreview'
import { Button, Card, CardHeader, DOCUMENT_KIND_LABEL, DOCUMENT_STATUS, DocumentStatusBadge, EmptyState, PageHeader, cn } from '../../components/ui'
import { formatDate, formatDateTime, formatFileSize } from '../../lib/format'
import { buildPohodaXml, downloadFile, exportFileName, isExportableKind } from '../../lib/pohodaXml'
import { PohodaExportModal } from './Documents'

const VAT_RATES = [23, 19, 5, 0]

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** '1 234,50' / '1234.5' -> 1234.5 */
function parseAmount(s: string) {
  const n = Number(s.replace(/\s| /g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const fmtAmount = (n: number) => (n ? n.toFixed(2).replace('.', ',') : '')

interface Draft {
  kind: DocumentKind
  data: InvoiceData
  base: string
  vat: string
  total: string
}

function toDraft(d: Document): Draft {
  return { kind: d.kind, data: { ...d.data }, base: fmtAmount(d.data.base), vat: fmtAmount(d.data.vat), total: fmtAmount(d.data.total) }
}

function draftData(dr: Draft): InvoiceData {
  return { ...dr.data, base: parseAmount(dr.base), vat: parseAmount(dr.vat), total: parseAmount(dr.total) }
}

export default function DocumentDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const doc = state.documents.find((d) => d.id === id)
  if (!doc) {
    return (
      <Card>
        <EmptyState title="Doklad sa nenašiel" description="Mohol byť odstránený klientom." action={<Link to="/documents" className="text-sm font-medium text-accent-700 hover:underline">Späť na doklady</Link>} />
      </Card>
    )
  }
  // key = reset formulára pri prechode na iný doklad
  return <DocumentDetailInner key={doc.id} doc={doc} />
}

function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600/80">{error}</span>}
    </label>
  )
}

function DocumentDetailInner({ doc }: { doc: Document }) {
  const { state, updateDocumentData, approveDocument, unapproveDocument } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Draft>(() => toDraft(doc))
  const [showErrors, setShowErrors] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const client = state.clients.find((c) => c.id === doc.clientId)
  const request = doc.requestId ? state.requests.find((r) => r.id === doc.requestId) : undefined
  const locked = doc.status === 'exported'
  const reviewed = doc.status === 'reviewed'

  const data = draftData(draft)
  const dirty = draft.kind !== doc.kind || JSON.stringify(data) !== JSON.stringify(doc.data)

  // navigácia v rámci rovnakého stavu
  const sameStatus = state.documents.filter((d) => d.status === doc.status).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  const idx = sameStatus.findIndex((d) => d.id === doc.id)
  const prev = idx > 0 ? sameStatus[idx - 1] : undefined
  const next = idx >= 0 && idx < sameStatus.length - 1 ? sameStatus[idx + 1] : undefined

  // nahranie dokladu je v histórii vždy – aj keď k nemu nie je samostatná udalosť (napr. ukážkové dáta)
  const history = [
    { id: 'upload', text: doc.uploadedBy === 'client' ? 'Klient nahral doklad' : 'Doklad nahraný účtovníčkou', at: doc.uploadedAt },
    ...state.events.filter((e) => e.documentId === doc.id && e.type !== 'client_uploaded'),
  ].sort((a, b) => b.at.localeCompare(a.at))

  const errors = {
    supplierName: !data.supplierName.trim() ? 'Doplňte dodávateľa' : undefined,
    invoiceNumber: !data.invoiceNumber.trim() ? 'Doplňte číslo dokladu' : undefined,
    issueDate: !data.issueDate ? 'Doplňte dátum vystavenia' : undefined,
    total: draft.kind !== 'bank_statement' && !data.total ? 'Doplňte sumu' : undefined,
  }
  const hasErrors = Object.values(errors).some(Boolean)
  const err = (k: keyof typeof errors) => (showErrors ? errors[k] : undefined)

  const set = <K extends keyof InvoiceData>(k: K, v: InvoiceData[K]) => setDraft((d) => ({ ...d, data: { ...d.data, [k]: v } }))

  // prepočet: základ/sadzba -> DPH a celkom; celkom -> základ a DPH; DPH -> celkom
  const fromBase = (baseStr: string, rate: number) => {
    const b = parseAmount(baseStr)
    const v = round2((b * rate) / 100)
    setDraft((d) => ({ ...d, base: baseStr, vat: fmtAmount(v), total: fmtAmount(round2(b + v)), data: { ...d.data, vatRate: rate } }))
  }
  const fromTotal = (totalStr: string) => {
    const t = parseAmount(totalStr)
    const b = round2(t / (1 + draft.data.vatRate / 100))
    setDraft((d) => ({ ...d, total: totalStr, base: fmtAmount(b), vat: fmtAmount(round2(t - b)) }))
  }
  const fromVat = (vatStr: string) => {
    setDraft((d) => ({ ...d, vat: vatStr, total: fmtAmount(round2(parseAmount(d.base) + parseAmount(vatStr))) }))
  }
  const normalize = () => setDraft((d) => ({ ...d, base: fmtAmount(parseAmount(d.base)), vat: fmtAmount(parseAmount(d.vat)), total: fmtAmount(parseAmount(d.total)) }))

  const save = () => {
    updateDocumentData(doc.id, data, draft.kind)
    toast('Údaje dokladu uložené')
  }

  const approve = () => {
    if (hasErrors) {
      setShowErrors(true)
      return
    }
    updateDocumentData(doc.id, data, draft.kind)
    approveDocument(doc.id)
    toast('Doklad schválený')
  }

  const unapprove = () => {
    unapproveDocument(doc.id)
    toast('Doklad vrátený na kontrolu', 'info')
  }

  const redownload = () => {
    if (!client) return
    const name = exportFileName(client, state.today)
    downloadFile(name, buildPohodaXml(client, [doc], state.today))
    toast(`XML stiahnuté znova – ${name}`, 'info')
  }

  const amountInput = (value: string, onChange: (v: string) => void, error?: string) => (
    <input
      className={cn('input num text-right', error && 'border-red-300')}
      inputMode="decimal"
      value={value}
      disabled={locked}
      placeholder="0,00"
      onChange={(e) => onChange(e.target.value)}
      onBlur={normalize}
    />
  )

  const text = (k: 'supplierName' | 'supplierIco' | 'supplierDic' | 'invoiceNumber' | 'variableSymbol' | 'description', error?: string, extra?: string) => (
    <input className={cn('input', extra, error && 'border-red-300')} value={draft.data[k]} disabled={locked} onChange={(e) => set(k, e.target.value)} />
  )

  const date = (k: 'issueDate' | 'taxDate' | 'dueDate', error?: string) => (
    <input type="date" className={cn('input num', error && 'border-red-300')} value={draft.data[k]} disabled={locked} onChange={(e) => set(k, e.target.value)} />
  )

  return (
    <div>
      <PageHeader
        back={
          <div className="flex items-center justify-between gap-3">
            <Link to="/documents" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
              <ArrowLeft size={14} strokeWidth={1.75} />
              Doklady
            </Link>
            {idx >= 0 && sameStatus.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <span className="num mr-1">
                  {DOCUMENT_STATUS[doc.status].label}: {idx + 1} / {sameStatus.length}
                </span>
                <Button size="sm" variant="ghost" disabled={!prev} onClick={() => prev && navigate(`/documents/${prev.id}`)} aria-label="Predchádzajúci doklad">
                  <ChevronLeft size={14} strokeWidth={1.75} />
                </Button>
                <Button size="sm" variant="ghost" disabled={!next} onClick={() => next && navigate(`/documents/${next.id}`)} aria-label="Ďalší doklad">
                  <ChevronRight size={14} strokeWidth={1.75} />
                </Button>
              </div>
            )}
          </div>
        }
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="break-all">{doc.fileName}</span>
            <DocumentStatusBadge status={doc.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            {client && (
              <Link to={`/clients/${client.id}`} className="font-medium text-zinc-700 hover:text-accent-700 hover:underline">
                {client.name}
              </Link>
            )}
            {request && (
              <>
                <span className="text-zinc-300">·</span>
                <span>
                  k požiadavke{' '}
                  <Link to={`/requests/${request.id}`} className="text-zinc-700 hover:text-accent-700 hover:underline">
                    {request.title}
                  </Link>
                </span>
              </>
            )}
            <span className="text-zinc-300">·</span>
            <span className="num">
              {doc.uploadedBy === 'client' ? 'nahral klient' : 'nahrala účtovníčka'} {formatDateTime(doc.uploadedAt)}
            </span>
            <span className="text-zinc-300">·</span>
            <span className="num">{formatFileSize(doc.fileSize)}</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <DocPreview doc={doc} className="mx-auto max-w-[640px]" />
        </div>

        <div className="min-w-0 space-y-4">
          {locked && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-zinc-900">Exportované do Pohody {formatDate(doc.exportedAt)}</p>
                <p className="text-xs text-zinc-500">Údaje sú uzamknuté, aby sa doklad nenaimportoval dvakrát s inými hodnotami.</p>
              </div>
              <Button size="sm" onClick={redownload}>
                <Download size={14} strokeWidth={1.75} />
                Stiahnuť XML znova
              </Button>
            </div>
          )}

          <Card>
            <CardHeader title="Údaje dokladu" description="Neskôr: údaje vyplní automaticky OCR, vy ich len skontrolujete." />
            <div className="grid grid-cols-1 gap-x-3 gap-y-3 p-4 sm:grid-cols-2">
              <Field label="Typ dokladu" className="sm:col-span-2">
                <select className="input" value={draft.kind} disabled={locked} onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as DocumentKind }))}>
                  {(Object.keys(DOCUMENT_KIND_LABEL) as DocumentKind[]).map((k) => (
                    <option key={k} value={k}>
                      {DOCUMENT_KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                {!isExportableKind(draft.kind) && <span className="mt-1 block text-xs text-zinc-500">Bankové výpisy a iné doklady sa do Pohody neexportujú ako faktúry.</span>}
              </Field>
              <Field label={draft.kind === 'issued_invoice' ? 'Odberateľ' : 'Dodávateľ'} error={err('supplierName')} className="sm:col-span-2">
                {text('supplierName', err('supplierName'))}
              </Field>
              <Field label="IČO">{text('supplierIco', undefined, 'num')}</Field>
              <Field label="DIČ">{text('supplierDic', undefined, 'num')}</Field>
              <Field label="Číslo faktúry" error={err('invoiceNumber')}>
                {text('invoiceNumber', err('invoiceNumber'))}
              </Field>
              <Field label="Variabilný symbol">{text('variableSymbol', undefined, 'num')}</Field>
              <Field label="Dátum vystavenia" error={err('issueDate')}>
                {date('issueDate', err('issueDate'))}
              </Field>
              <Field label="Dátum zdaniteľného plnenia (DZP)">{date('taxDate')}</Field>
              <Field label="Dátum splatnosti">{date('dueDate')}</Field>
              <Field label="Sadzba DPH">
                <select className="input num" value={draft.data.vatRate} disabled={locked} onChange={(e) => fromBase(draft.base, Number(e.target.value))}>
                  {VAT_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r} %
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="border-t border-zinc-200 bg-zinc-50/60 p-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Základ dane">{amountInput(draft.base, (v) => fromBase(v, draft.data.vatRate))}</Field>
                <Field label="DPH">{amountInput(draft.vat, fromVat)}</Field>
                <Field label="Celkom (EUR)" error={err('total')}>
                  {amountInput(draft.total, fromTotal, err('total'))}
                </Field>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Zmena základu alebo sadzby prepočíta DPH a celkovú sumu; zmena celkovej sumy prepočíta základ.</p>
            </div>

            <div className="p-4 pt-3">
              <Field label="Popis">
                <textarea className="input min-h-[60px]" value={draft.data.description} disabled={locked} onChange={(e) => set('description', e.target.value)} rows={2} />
              </Field>
            </div>

            {!locked && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3">
                {showErrors && hasErrors && <p className="mr-auto text-xs text-red-600/80">Pred schválením doplňte povinné údaje.</p>}
                {dirty && !(showErrors && hasErrors) && <p className="mr-auto text-xs text-zinc-500">Neuložené zmeny</p>}
                {reviewed && (
                  <Button onClick={unapprove}>
                    <RotateCcw size={14} strokeWidth={1.75} />
                    Vrátiť na kontrolu
                  </Button>
                )}
                <Button onClick={save} disabled={!dirty}>
                  Uložiť
                </Button>
                {doc.status === 'uploaded' && (
                  <Button variant="primary" onClick={approve}>
                    Schváliť
                  </Button>
                )}
                {reviewed && isExportableKind(doc.kind) && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (dirty) updateDocumentData(doc.id, data, draft.kind)
                      setExportOpen(true)
                    }}
                  >
                    <Download size={14} strokeWidth={1.75} />
                    Exportovať do Pohody
                  </Button>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="História dokladu" />
            {history.length === 0 ? (
              <p className="px-4 py-3 text-sm text-zinc-500">Zatiaľ bez záznamov.</p>
            ) : (
              <ol className="divide-y divide-zinc-100">
                {history.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-4 px-4 py-2 text-sm">
                    <span className="text-zinc-700">{e.text}</span>
                    <span className="num shrink-0 text-xs text-zinc-500">{formatDateTime(e.at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <PohodaExportModal open={exportOpen} onClose={() => setExportOpen(false)} docs={[{ ...doc, kind: draft.kind, data }]} />
    </div>
  )
}
