import { useMemo, type ReactNode } from 'react'
import type { Document } from '../data/types'
import { useStore } from '../store/AppStore'
import { formatDate } from '../lib/format'
import { cn } from './ui'

const eur = (n: number) => new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Falošný QR kód (PAY by square) – deterministický podľa id dokladu */
function FakeQr({ seed, size = 64 }: { seed: string; size?: number }) {
  const cells = useMemo(() => {
    const n = 21
    let h = hash(seed)
    const out: [number, number][] = []
    const finder = (x: number, y: number) => {
      const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7
      for (const [ox, oy] of [
        [0, 0],
        [n - 7, 0],
        [0, n - 7],
      ]) {
        if (inBox(ox, oy)) {
          const dx = x - ox
          const dy = y - oy
          const ring = dx === 0 || dy === 0 || dx === 6 || dy === 6
          const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
          return ring || core ? 1 : 0
        }
      }
      return -1
    }
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const f = finder(x, y)
        if (f === 1) out.push([x, y])
        else if (f === -1) {
          h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
          if (h % 100 < 47) out.push([x, y])
        }
      }
    return out
  }, [seed])
  return (
    <svg width={size} height={size} viewBox="-1 -1 23 23" className="shrink-0" aria-hidden>
      <rect x={-1} y={-1} width={23} height={23} fill="white" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill="#27272a" />
      ))}
    </svg>
  )
}

function Paper({ children, compact, className }: { children: ReactNode; compact?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-white text-zinc-800',
        compact ? 'aspect-[1/1.414] rounded border border-zinc-200' : 'aspect-[1/1.414] rounded-sm border border-zinc-200 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

function CompactLines({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col gap-[6%] p-[10%]">
      <div className="truncate text-[7px] font-semibold leading-none text-zinc-700">{title}</div>
      <div className="h-[3%] w-2/3 rounded-sm bg-zinc-200" />
      <div className="h-[3%] w-1/2 rounded-sm bg-zinc-100" />
      <div className="mt-[6%] h-[3%] w-full rounded-sm bg-zinc-100" />
      <div className="h-[3%] w-full rounded-sm bg-zinc-100" />
      <div className="h-[3%] w-5/6 rounded-sm bg-zinc-100" />
      <div className="mt-auto ml-auto h-[4%] w-1/3 rounded-sm bg-zinc-300" />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-zinc-500">{label}</span>
      <span className="num">{value}</span>
    </div>
  )
}

function InvoicePaper({ doc, clientName, clientIco, clientDic }: { doc: Document; clientName: string; clientIco: string; clientDic: string }) {
  const x = doc.data
  const issued = doc.kind === 'issued_invoice'
  const supplier = issued ? { name: clientName, ico: clientIco, dic: clientDic } : { name: x.supplierName, ico: x.supplierIco, dic: x.supplierDic }
  const customer = issued ? { name: x.supplierName, ico: x.supplierIco, dic: x.supplierDic } : { name: clientName, ico: clientIco, dic: clientDic }
  return (
    <div className="flex h-full flex-col p-[7%] text-[11px] leading-snug">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-300 pb-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{supplier.name || 'Dodávateľ'}</p>
          <p className="num text-zinc-500">
            IČO: {supplier.ico || '–'} &nbsp; DIČ: {supplier.dic || '–'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-semibold tracking-tight">FAKTÚRA</p>
          <p className="num text-zinc-600">č. {x.invoiceNumber || '–'}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="rounded-sm border border-zinc-200 p-2">
          <p className="mb-1 text-[9px] font-medium uppercase tracking-wide text-zinc-400">Odberateľ</p>
          <p className="font-medium">{customer.name || '–'}</p>
          <p className="num text-zinc-500">IČO: {customer.ico || '–'}</p>
          {customer.dic && <p className="num text-zinc-500">DIČ: {customer.dic}</p>}
        </div>
        <div className="space-y-0.5">
          <Row label="Dátum vystavenia" value={formatDate(x.issueDate)} />
          <Row label="Dátum dodania" value={formatDate(x.taxDate || x.issueDate)} />
          <Row label="Splatnosť" value={formatDate(x.dueDate)} />
          <Row label="Variabilný symbol" value={x.variableSymbol || '–'} />
          <Row label="Forma úhrady" value="prevodným príkazom" />
        </div>
      </div>

      <table className="mt-5 w-full text-left">
        <thead>
          <tr className="border-b border-zinc-300 text-[9px] uppercase tracking-wide text-zinc-400">
            <th className="py-1 font-medium">Popis</th>
            <th className="py-1 text-right font-medium">Mn.</th>
            <th className="py-1 text-right font-medium">Základ</th>
            <th className="py-1 text-right font-medium">DPH</th>
            <th className="py-1 text-right font-medium">Spolu</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-zinc-100">
            <td className="py-1.5 pr-2">{x.description || 'Položka'}</td>
            <td className="num py-1.5 text-right">1</td>
            <td className="num py-1.5 text-right">{eur(x.base)}</td>
            <td className="num py-1.5 text-right">{x.vatRate} %</td>
            <td className="num py-1.5 text-right">{eur(x.total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="flex items-end gap-2">
          <FakeQr seed={doc.id} />
          <p className="pb-1 text-[9px] text-zinc-400">PAY by square</p>
        </div>
        <table className="text-right">
          <tbody>
            <tr>
              <td className="pr-4 text-zinc-500">Základ dane {x.vatRate} %</td>
              <td className="num">{eur(x.base)} €</td>
            </tr>
            <tr>
              <td className="pr-4 text-zinc-500">DPH {x.vatRate} %</td>
              <td className="num">{eur(x.vat)} €</td>
            </tr>
            <tr className="border-t border-zinc-300 text-[12px] font-semibold">
              <td className="pr-4 pt-1">Celkom na úhradu</td>
              <td className="num pt-1">{eur(x.total)} €</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-auto border-t border-zinc-200 pt-2 text-[9px] text-zinc-400">
        Spoločnosť je zapísaná v Obchodnom registri. Faktúra slúži zároveň ako dodací list.
      </p>
    </div>
  )
}

function ReceiptPaper({ doc }: { doc: Document }) {
  const x = doc.data
  return (
    <div className="flex h-full items-start justify-center bg-zinc-100 p-[6%]">
      <div className="w-[62%] bg-white px-4 py-5 font-mono text-[10px] leading-snug text-zinc-800 shadow-sm ring-1 ring-zinc-200">
        <p className="text-center font-semibold">{x.supplierName || 'Predajca'}</p>
        <p className="num text-center">IČO {x.supplierIco || '–'}</p>
        <p className="num text-center">DIČ {x.supplierDic || '–'}</p>
        <p className="mt-2 text-center">POKLADNIČNÝ DOKLAD</p>
        <p className="num text-center text-zinc-500">č. {x.invoiceNumber || '–'}</p>
        <div className="my-2 border-t border-dashed border-zinc-400" />
        <div className="flex justify-between gap-2">
          <span className="truncate">{x.description || 'Položka'}</span>
          <span className="num">{eur(x.total)}</span>
        </div>
        <div className="my-2 border-t border-dashed border-zinc-400" />
        <div className="flex justify-between">
          <span>Základ {x.vatRate} %</span>
          <span className="num">{eur(x.base)}</span>
        </div>
        <div className="flex justify-between">
          <span>DPH {x.vatRate} %</span>
          <span className="num">{eur(x.vat)}</span>
        </div>
        <div className="mt-1 flex justify-between font-semibold">
          <span>SPOLU EUR</span>
          <span className="num">{eur(x.total)}</span>
        </div>
        <div className="my-2 border-t border-dashed border-zinc-400" />
        <p className="num">{formatDate(x.issueDate)}</p>
        <p className="num break-all text-zinc-500">OKP: {hash(doc.id).toString(16).padStart(8, '0')}-{hash(doc.fileName).toString(16).slice(0, 8)}</p>
        <div className="mt-2 flex justify-center">
          <FakeQr seed={doc.id + 'r'} size={56} />
        </div>
        <p className="mt-2 text-center text-zinc-500">eKasa · Ďakujeme za nákup</p>
      </div>
    </div>
  )
}

function StatementPaper({ doc, clientName }: { doc: Document; clientName: string }) {
  const x = doc.data
  const h = hash(doc.id)
  const rows = [
    { d: '02.09.', t: 'Úhrada faktúry – odberateľ', a: 2400 + (h % 900) },
    { d: '05.09.', t: 'Trvalý príkaz – prenájom', a: -492 },
    { d: '11.09.', t: 'Platba kartou – Alza.sk', a: -289.9 },
    { d: '15.09.', t: 'Odvod Sociálna poisťovňa', a: -(410 + (h % 60)) },
    { d: '22.09.', t: 'Prijatá platba – VS 2026081', a: 1250 },
    { d: '30.09.', t: 'Poplatok za vedenie účtu', a: -7.5 },
  ]
  return (
    <div className="flex h-full flex-col p-[7%] text-[11px] leading-snug">
      <div className="flex items-start justify-between border-b border-zinc-300 pb-3">
        <div>
          <p className="text-[13px] font-semibold">{x.supplierName || 'Banka'}</p>
          <p className="text-zinc-500">Výpis z účtu {x.invoiceNumber ? `č. ${x.invoiceNumber}` : ''}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">{clientName}</p>
          <p className="num text-zinc-500">SK31 1100 0000 0029 {String(h % 10000).padStart(4, '0')} 1234</p>
        </div>
      </div>
      <p className="mt-2 text-zinc-500">Obdobie: do {formatDate(x.issueDate)}</p>
      <table className="mt-3 w-full">
        <thead>
          <tr className="border-b border-zinc-300 text-left text-[9px] uppercase tracking-wide text-zinc-400">
            <th className="py-1 font-medium">Dátum</th>
            <th className="py-1 font-medium">Popis transakcie</th>
            <th className="py-1 text-right font-medium">Suma €</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.d + r.t} className="border-b border-zinc-100">
              <td className="num py-1 pr-2">{r.d}</td>
              <td className="py-1 pr-2">{r.t}</td>
              <td className="num py-1 text-right">{eur(r.a)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-auto border-t border-zinc-200 pt-2 text-[9px] text-zinc-400">Výpis je generovaný elektronicky a nevyžaduje podpis.</p>
    </div>
  )
}

function OtherPaper({ doc }: { doc: Document }) {
  const x = doc.data
  return (
    <div className="flex h-full flex-col p-[7%] text-[11px] leading-snug">
      <p className="text-[13px] font-semibold">{x.supplierName || 'Doklad'}</p>
      <p className="num text-zinc-500">{x.invoiceNumber}</p>
      <p className="mt-4 font-medium">{x.description || doc.fileName}</p>
      <p className="num mt-1 text-zinc-500">Dátum: {formatDate(x.issueDate)}</p>
      <div className="mt-4 space-y-1.5">
        {[90, 75, 82, 60, 88, 40].map((w, i) => (
          <div key={i} className="h-1.5 rounded-sm bg-zinc-100" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

/**
 * Náhľad dokladu. Ak má doklad nahratý súbor, zobrazí ho; inak vygeneruje
 * realisticky vyzerajúci papierový náhľad z údajov dokladu.
 */
export function DocPreview({ doc, compact, className }: { doc: Document; compact?: boolean; className?: string }) {
  const { state } = useStore()
  const client = state.clients.find((c) => c.id === doc.clientId)

  if (doc.fileUrl && doc.fileType === 'image') {
    return (
      <div className={cn('overflow-hidden rounded border border-zinc-200 bg-zinc-100', compact ? 'aspect-[1/1.414]' : '', className)}>
        <img src={doc.fileUrl} alt={doc.fileName} className={cn('h-full w-full', compact ? 'object-cover' : 'object-contain')} />
      </div>
    )
  }

  if (doc.fileUrl && doc.fileType === 'pdf') {
    if (compact) {
      return (
        <Paper compact className={className}>
          <div className="flex h-full items-center justify-center text-[10px] font-semibold text-zinc-400">PDF</div>
        </Paper>
      )
    }
    return (
      <div className={cn('overflow-hidden rounded border border-zinc-200 bg-zinc-100', className)}>
        <object data={doc.fileUrl} type="application/pdf" className="aspect-[1/1.414] w-full">
          <div className="flex aspect-[1/1.414] w-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-zinc-500">
            Prehliadač nevie PDF zobraziť priamo.
            <a href={doc.fileUrl} download={doc.fileName} className="font-medium text-accent-700 hover:underline">
              Stiahnuť {doc.fileName}
            </a>
          </div>
        </object>
      </div>
    )
  }

  const titleByKind: Record<Document['kind'], string> = {
    received_invoice: 'FAKTÚRA',
    issued_invoice: 'FAKTÚRA',
    receipt: 'Pokladničný doklad',
    bank_statement: 'Výpis z účtu',
    other: 'Doklad',
  }

  const hasData = !!(doc.data.supplierName || doc.data.invoiceNumber || doc.data.total)

  if (compact) {
    return (
      <Paper compact className={className}>
        <CompactLines title={doc.data.supplierName || titleByKind[doc.kind]} />
      </Paper>
    )
  }

  if (!hasData) {
    return (
      <Paper className={className}>
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-zinc-400">Náhľad súboru nie je k dispozícii</div>
      </Paper>
    )
  }

  return (
    <Paper className={className}>
      {doc.kind === 'receipt' ? (
        <ReceiptPaper doc={doc} />
      ) : doc.kind === 'bank_statement' ? (
        <StatementPaper doc={doc} clientName={client?.name ?? ''} />
      ) : doc.kind === 'other' ? (
        <OtherPaper doc={doc} />
      ) : (
        <InvoicePaper doc={doc} clientName={client?.name ?? ''} clientIco={client?.ico ?? ''} clientDic={client?.dic ?? ''} />
      )}
    </Paper>
  )
}

export default DocPreview
