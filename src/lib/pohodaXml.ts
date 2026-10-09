import type { Client, Document, DocumentKind } from '../data/types'

/** Do Pohody sa ako faktúry exportujú len faktúry a pokladničné doklady */
export const EXPORTABLE_KINDS: DocumentKind[] = ['received_invoice', 'issued_invoice', 'receipt']

export function isExportableKind(kind: DocumentKind) {
  return EXPORTABLE_KINDS.includes(kind)
}

export function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const amount = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2)

function stripDiacritics(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Krátky názov klienta do názvu súboru: GreenTech, Kovac, Mraz … */
export function clientFileSlug(client: Client) {
  const base = client.name.split('–')[0].replace(/s\.\s?r\.\s?o\.|a\.\s?s\./gi, '').trim()
  const words = stripDiacritics(base)
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)
  const word = client.legalForm === 'szco' && words.length > 1 ? words[words.length - 1] : words[0]
  return word || 'klient'
}

export function exportFileName(client: Client, today: string) {
  return `pohoda_${clientFileSlug(client)}_${today.slice(0, 10)}.xml`
}

function el(tag: string, value: string | undefined, indent: string) {
  if (value === undefined || value === '') return ''
  return `${indent}<${tag}>${escapeXml(value)}</${tag}>\n`
}

/** Rozpis súm podľa sadzby DPH (SK: 23 → priceHigh, 19 → priceLow, 5 → price3, 0 → priceNone) */
function homeCurrency(d: Document, indent: string) {
  const { base, vat, total, vatRate } = d.data
  const i = indent
  switch (vatRate) {
    case 23:
      return `${i}<typ:priceHigh>${amount(base)}</typ:priceHigh>\n${i}<typ:priceHighVAT>${amount(vat)}</typ:priceHighVAT>\n${i}<typ:priceHighSum>${amount(total)}</typ:priceHighSum>\n`
    case 19:
      return `${i}<typ:priceLow>${amount(base)}</typ:priceLow>\n${i}<typ:priceLowVAT>${amount(vat)}</typ:priceLowVAT>\n${i}<typ:priceLowSum>${amount(total)}</typ:priceLowSum>\n`
    case 5:
      return `${i}<typ:price3>${amount(base)}</typ:price3>\n${i}<typ:price3VAT>${amount(vat)}</typ:price3VAT>\n${i}<typ:price3Sum>${amount(total)}</typ:price3Sum>\n`
    default:
      return `${i}<typ:priceNone>${amount(total || base)}</typ:priceNone>\n`
  }
}

function invoiceItem(d: Document, n: number) {
  const x = d.data
  const issued = d.kind === 'issued_invoice'
  const h = '        '
  const a = '            '
  let header = ''
  header += `${h}<inv:invoiceType>${issued ? 'issuedInvoice' : 'receivedInvoice'}</inv:invoiceType>\n`
  if (issued) {
    if (x.invoiceNumber) header += `${h}<inv:number>\n${a.slice(2)}<typ:numberRequested>${escapeXml(x.invoiceNumber)}</typ:numberRequested>\n${h}</inv:number>\n`
  } else {
    // pri prijatých dokladoch je číslo dodávateľa „pôvodný doklad“, interné číslo pridelí Pohoda z číselného radu
    header += el('inv:originalDocument', x.invoiceNumber, h)
  }
  header += el('inv:symVar', (x.variableSymbol || x.invoiceNumber).replace(/\D/g, '').slice(0, 20), h)
  header += el('inv:date', x.issueDate, h)
  header += el('inv:dateTax', x.taxDate || x.issueDate, h)
  header += el('inv:dateDue', x.dueDate, h)
  header += el('inv:text', x.description, h)
  header +=
    `${h}<inv:partnerIdentity>\n` +
    `${a.slice(2)}<typ:address>\n` +
    el('typ:company', x.supplierName, a) +
    el('typ:ico', x.supplierIco, a) +
    el('typ:dic', x.supplierDic, a) +
    `${a.slice(2)}</typ:address>\n` +
    `${h}</inv:partnerIdentity>\n`

  return (
    `  <dat:dataPackItem version="2.0" id="${escapeXml(`${String(n).padStart(3, '0')}-${d.id}`)}">\n` +
    `    <inv:invoice version="2.0">\n` +
    `      <inv:invoiceHeader>\n` +
    header +
    `      </inv:invoiceHeader>\n` +
    `      <inv:invoiceSummary>\n` +
    `        <inv:roundingDocument>none</inv:roundingDocument>\n` +
    `        <inv:homeCurrency>\n` +
    homeCurrency(d, '          ') +
    `        </inv:homeCurrency>\n` +
    `      </inv:invoiceSummary>\n` +
    `    </inv:invoice>\n` +
    `  </dat:dataPackItem>\n`
  )
}

/**
 * Vygeneruje XML na import do POHODA (dataPack 2.0) pre doklady JEDNÉHO klienta.
 * Bankové výpisy a iné doklady sú vynechané.
 */
export function buildPohodaXml(client: Client, docs: Document[], today: string) {
  const items = docs.filter((d) => isExportableKind(d.kind))
  const packId = `CIS-${clientFileSlug(client)}-${today.slice(0, 10).replace(/-/g, '')}`
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<dat:dataPack xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"` +
    ` xmlns:inv="http://www.stormware.cz/schema/version_2/invoice.xsd"` +
    ` xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd"` +
    ` version="2.0" id="${escapeXml(packId)}" ico="${escapeXml(client.ico)}" application="Cisielka"` +
    ` note="${escapeXml(`Export dokladov – ${client.name}`)}">\n` +
    items.map((d, i) => invoiceItem(d, i + 1)).join('') +
    `</dat:dataPack>\n`
  )
}

/** Stiahne textový súbor v prehliadači */
export function downloadFile(filename: string, content: string, mime = 'application/xml;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 1000)
}
