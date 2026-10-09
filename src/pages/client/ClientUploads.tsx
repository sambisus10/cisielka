import { Link } from 'react-router-dom'
import { useStore } from '../../store/AppStore'
import type { Document } from '../../data/types'
import { Badge, EmptyState } from '../../components/ui'
import { formatDate, formatPeriod } from '../../lib/format'
import { FileThumb } from './shared'

const monthLabel = (ym: string) => {
  const s = formatPeriod(ym)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function ClientUploads() {
  const { state } = useStore()
  const docs = state.documents
    .filter((d) => d.clientId === state.portalClientId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))

  const groups: { month: string; docs: Document[] }[] = []
  for (const d of docs) {
    const month = d.uploadedAt.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last?.month === month) last.docs.push(d)
    else groups.push({ month, docs: [d] })
  }

  return (
    <div>
      <div className="px-1 pb-4 pt-2">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">Odovzdané doklady</h1>
        <p className="mt-1 text-sm text-zinc-500">Všetko, čo ste poslali účtovníčke.</p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <EmptyState title="Zatiaľ ste nič neodovzdali" description="Doklady, ktoré nahráte k požiadavkám, nájdete tu." />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.month}>
              <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-zinc-400">{monthLabel(g.month)}</h2>
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                {g.docs.map((d) => (
                  <li key={d.id}>
                    <DocRow doc={d} requestTitle={state.requests.find((r) => r.id === d.requestId)?.title} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function DocRow({ doc, requestTitle }: { doc: Document; requestTitle?: string }) {
  const content = (
    <>
      <FileThumb doc={doc} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-900">{doc.fileName}</span>
        <span className="block truncate text-xs text-zinc-500">{requestTitle ?? 'Bez požiadavky'}</span>
        <span className="num block text-xs text-zinc-400">{formatDate(doc.uploadedAt)}</span>
      </span>
      {doc.status === 'uploaded' ? <Badge tone="blue">Prijaté</Badge> : <Badge tone="green">Spracované</Badge>}
    </>
  )
  const cls = 'flex min-h-[64px] items-center gap-3 px-3 py-3'
  return doc.requestId ? (
    <Link to={`/portal/requests/${doc.requestId}`} className={`${cls} hover:bg-zinc-50`}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  )
}
