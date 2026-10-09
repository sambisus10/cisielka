import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Download, Search, X } from 'lucide-react'
import type { Client, Document, DocumentStatus } from '../../data/types'
import { useStore } from '../../store/AppStore'
import { useToast } from '../../components/Toast'
import { Button, Card, DOCUMENT_KIND_LABEL, DocumentStatusBadge, EmptyState, Modal, PageHeader, Tabs, cn } from '../../components/ui'
import { formatDate, formatMoney, plural } from '../../lib/format'
import { buildPohodaXml, downloadFile, exportFileName, isExportableKind } from '../../lib/pohodaXml'

/* ---------- Export do Pohody (zdieľané s detailom dokladu) ---------- */

/** „1 doklad už bol exportovaný“ / „2 doklady už boli exportované“ / „5 dokladov už bolo exportovaných“ */
function alreadyExportedText(n: number) {
  if (n === 1) return '1 doklad už bol exportovaný'
  if (n >= 2 && n <= 4) return `${n} doklady už boli exportované`
  return `${n} dokladov už bolo exportovaných`
}

function exportedToastText(n: number) {
  if (n === 1) return 'Exportovaný 1 doklad'
  if (n >= 2 && n <= 4) return `Exportované ${n} doklady`
  return `Exportovaných ${n} dokladov`
}

interface ExportGroup {
  client: Client
  docs: Document[]
  fileName: string
  total: number
}

/**
 * Modál s náhľadom exportu do Pohody. Kontroluje:
 * – neskontrolované doklady (vynechá ich),
 * – bankové výpisy a iné doklady (do Pohody sa ako faktúry neexportujú),
 * – už exportované doklady (ochrana pred dvojitým exportom – predvolene vynechané).
 * Pri viacerých klientoch vytvorí jeden XML súbor na klienta.
 */
export function PohodaExportModal({ open, onClose, docs, onDone }: { open: boolean; onClose: () => void; docs: Document[]; onDone?: () => void }) {
  const { state, markExported } = useStore()
  const toast = useToast()
  const [reexport, setReexport] = useState(false)

  const notReviewed = docs.filter((d) => d.status === 'uploaded')
  const notInvoice = docs.filter((d) => d.status !== 'uploaded' && !isExportableKind(d.kind))
  const exported = docs.filter((d) => d.status === 'exported' && isExportableKind(d.kind))
  const ready = docs.filter((d) => d.status === 'reviewed' && isExportableKind(d.kind))
  const toExport = reexport ? [...ready, ...exported] : ready
  const exportedDates = [...new Set(exported.map((d) => formatDate(d.exportedAt)))]

  const groups: ExportGroup[] = (() => {
    const byClient = new Map<string, Document[]>()
    for (const d of toExport) byClient.set(d.clientId, [...(byClient.get(d.clientId) ?? []), d])
    return [...byClient.entries()].flatMap(([clientId, ds]) => {
      const client = state.clients.find((c) => c.id === clientId)
      if (!client) return []
      return [{ client, docs: ds, fileName: exportFileName(client, state.today), total: ds.reduce((s, d) => s + (d.data.total || 0), 0) }]
    })
  })()

  const close = () => {
    setReexport(false)
    onClose()
  }

  const run = () => {
    groups.forEach((g, i) => {
      const xml = buildPohodaXml(g.client, g.docs, state.today)
      // viac súborov – malé oneskorenie, aby prehliadač neblokoval sťahovanie
      setTimeout(() => downloadFile(g.fileName, xml), i * 400)
    })
    markExported(toExport.map((d) => d.id))
    const files = groups.length === 1 ? `súbor ${groups[0].fileName}` : `${plural(groups.length, 'súbor', 'súbory', 'súborov')} (jeden na klienta)`
    toast(`${exportedToastText(toExport.length)} – ${files}`)
    setReexport(false)
    onDone?.()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Export do Pohody"
      description="Skontrolujte, čo sa vyexportuje. Každý klient dostane samostatný XML súbor."
      width="max-w-xl"
      footer={
        <>
          <Button onClick={close}>Zrušiť</Button>
          <Button variant="primary" onClick={run} disabled={toExport.length === 0}>
            <Download size={14} strokeWidth={1.75} />
            {groups.length > 1 ? `Stiahnuť ${plural(groups.length, 'XML súbor', 'XML súbory', 'XML súborov')}` : 'Stiahnuť XML'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {exported.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="font-medium">
                  {alreadyExportedText(exported.length)} {exportedDates.join(', ')}. Exportovať znova?
                </p>
                <p className="mt-0.5 text-amber-800">Opätovný import vytvorí v Pohode duplicitné záznamy.</p>
                <div className="mt-2 flex flex-col gap-1">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={!reexport} onChange={() => setReexport(false)} className="accent-accent-600" />
                    Vynechať už exportované (odporúčané)
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={reexport} onChange={() => setReexport(true)} className="accent-accent-600" />
                    Exportovať ich znova
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {notReviewed.length > 0 && (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            {plural(notReviewed.length, 'doklad ešte nie je skontrolovaný', 'doklady ešte nie sú skontrolované', 'dokladov ešte nie je skontrolovaných')} – pred exportom ich treba
            skontrolovať. Budú vynechané.
          </p>
        )}

        {notInvoice.length > 0 && (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            Bankové výpisy a iné doklady sa do Pohody neexportujú ako faktúry. Vynechané: <span className="num">{notInvoice.length}</span>.
          </p>
        )}

        {groups.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">Nie je čo exportovať.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-xs font-medium text-zinc-500">
                  <th className="px-3 py-2 font-medium">Klient</th>
                  <th className="px-3 py-2 text-right font-medium">Doklady</th>
                  <th className="px-3 py-2 text-right font-medium">Suma spolu</th>
                  <th className="px-3 py-2 font-medium">Súbor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {groups.map((g) => (
                  <tr key={g.client.id}>
                    <td className="px-3 py-2 font-medium text-zinc-900">
                      {g.client.name}
                      <span className="num block text-xs font-normal text-zinc-500">IČO {g.client.ico}</span>
                    </td>
                    <td className="num px-3 py-2 text-right">{g.docs.length}</td>
                    <td className="num px-3 py-2 text-right">{formatMoney(g.total)}</td>
                    <td className="num px-3 py-2 text-xs text-zinc-600">{g.fileName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-zinc-500">
          V Pohode: <span className="font-medium text-zinc-700">Súbor → Datová komunikace → XML import</span>. Doklady sa naimportujú ako prijaté faktúry, pôvodné číslo dodávateľa ostane v poli Doklad.
        </p>
      </div>
    </Modal>
  )
}

/* ---------- Zoznam dokladov ---------- */

type TabValue = DocumentStatus | 'all'

const TAB_LABELS: Record<TabValue, string> = {
  uploaded: 'Na kontrolu',
  reviewed: 'Pripravené na export',
  exported: 'Exportované',
  all: 'Všetky',
}

export default function Documents() {
  const { state } = useStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabValue) || 'uploaded'
  const clientId = params.get('client') ?? ''
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    setSelected(new Set())
  }

  const clientName = (id: string) => state.clients.find((c) => c.id === id)?.name ?? '–'

  const base = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.documents
      .filter((d) => !clientId || d.clientId === clientId)
      .filter(
        (d) =>
          !q ||
          d.data.supplierName.toLowerCase().includes(q) ||
          d.data.invoiceNumber.toLowerCase().includes(q) ||
          d.fileName.toLowerCase().includes(q),
      )
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  }, [state.documents, clientId, query])

  const counts: Record<TabValue, number> = {
    uploaded: base.filter((d) => d.status === 'uploaded').length,
    reviewed: base.filter((d) => d.status === 'reviewed').length,
    exported: base.filter((d) => d.status === 'exported').length,
    all: base.length,
  }

  const rows = tab === 'all' ? base : base.filter((d) => d.status === tab)
  const selectedDocs = state.documents.filter((d) => selected.has(d.id))
  const allChecked = rows.length > 0 && rows.every((d) => selected.has(d.id))
  const selectedTotal = selectedDocs.reduce((s, d) => s + (d.data.total || 0), 0)

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((d) => d.id)))

  return (
    <div>
      <PageHeader
        title="Doklady"
        description="Doklady od klientov: skontrolujte údaje, schváľte a exportujte do Pohody. Exportované doklady sa označia, aby sa nenaimportovali dvakrát."
        actions={
          tab === 'reviewed' && rows.some((d) => isExportableKind(d.kind)) ? (
            <Button
              variant="primary"
              onClick={() => {
                setSelected(new Set(rows.filter((d) => isExportableKind(d.kind)).map((d) => d.id)))
                setExportOpen(true)
              }}
            >
              <Download size={14} strokeWidth={1.75} />
              Exportovať všetky pripravené
            </Button>
          ) : undefined
        }
      />

      <Tabs<TabValue>
        value={tab}
        onChange={(v) => setParam('tab', v === 'uploaded' ? '' : v)}
        items={(['uploaded', 'reviewed', 'exported', 'all'] as TabValue[]).map((v) => ({ value: v, label: TAB_LABELS[v], count: counts[v] }))}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select className="input w-auto min-w-[200px]" value={clientId} onChange={(e) => setParam('client', e.target.value)}>
          <option value="">Všetci klienti</option>
          {state.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="relative w-full sm:w-72">
          <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-8" placeholder="Hľadať dodávateľa, číslo, súbor" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-xs">
          <span className="font-medium text-zinc-900">
            Vybrané: <span className="num">{selected.size}</span>
          </span>
          <span className="num text-zinc-500">{formatMoney(selectedTotal)}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <X size={14} strokeWidth={1.75} />
              Zrušiť výber
            </Button>
            <Button size="sm" variant="primary" onClick={() => setExportOpen(true)}>
              <Download size={14} strokeWidth={1.75} />
              Exportovať do Pohody ({selected.size})
            </Button>
          </div>
        </div>
      )}

      <Card className="mt-3">
        {rows.length === 0 ? (
          <EmptyState
            title={tab === 'uploaded' ? 'Nič nečaká na kontrolu' : 'Žiadne doklady'}
            description={query || clientId ? 'Skúste zmeniť filter alebo hľadaný výraz.' : tab === 'uploaded' ? 'Keď klient nahrá doklad, objaví sa tu.' : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
                  <th className="w-10 px-4 py-2.5">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-accent-600" aria-label="Vybrať všetky" />
                  </th>
                  <th className="px-3 py-2.5 font-medium">Doklad</th>
                  <th className="px-3 py-2.5 font-medium">Klient</th>
                  <th className="px-3 py-2.5 font-medium">Dodávateľ</th>
                  <th className="px-3 py-2.5 font-medium">Číslo</th>
                  <th className="px-3 py-2.5 font-medium">Dátum</th>
                  <th className="px-3 py-2.5 text-right font-medium">Suma</th>
                  <th className="px-3 py-2.5 font-medium">Stav</th>
                  <th className="px-3 py-2.5 pr-4 font-medium">Nahrané</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/documents/${d.id}`)}
                    className={cn('cursor-pointer hover:bg-zinc-50', selected.has(d.id) && 'bg-accent-50/40')}
                  >
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} className="accent-accent-600" aria-label={`Vybrať ${d.fileName}`} />
                    </td>
                    <td className="max-w-[220px] px-3 py-2.5">
                      <p className="truncate font-medium text-zinc-900">{d.fileName}</p>
                      <p className="text-xs text-zinc-500">{DOCUMENT_KIND_LABEL[d.kind]}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">{clientName(d.clientId)}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-zinc-700">{d.data.supplierName || <span className="text-zinc-400">–</span>}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-zinc-700">{d.data.invoiceNumber || <span className="text-zinc-400">–</span>}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-zinc-700">{formatDate(d.data.issueDate)}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right text-zinc-900">{d.data.total ? formatMoney(d.data.total) : <span className="text-zinc-400">–</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <DocumentStatusBadge status={d.status} />
                      {d.status === 'exported' && <span className="num ml-1.5 text-xs text-zinc-500">{formatDate(d.exportedAt)}</span>}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2.5 pr-4 text-zinc-500">{formatDate(d.uploadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PohodaExportModal open={exportOpen} onClose={() => setExportOpen(false)} docs={selectedDocs} onDone={() => setSelected(new Set())} />
    </div>
  )
}
