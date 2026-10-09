import type {
  AccountantNotification,
  AppState,
  Client,
  ClientMessage,
  Comment,
  Document,
  DocumentKind,
  HistoryEvent,
  InvoiceData,
  Request,
} from './types'
import { addDays, formatDate } from '../lib/format'

export const STATE_VERSION = 1
export const TODAY = '2026-10-09T09:00'

const clients: Client[] = [
  {
    id: 'c1',
    name: 'Peter Kováč',
    contactName: 'Peter Kováč',
    email: 'peter.kovac@email.sk',
    phone: '+421 905 123 456',
    ico: '51234567',
    dic: '1087654321',
    icDph: 'SK1087654321',
    legalForm: 'szco',
    vatPayer: true,
    note: 'IT freelancer, vývoj softvéru',
  },
  {
    id: 'c2',
    name: 'Novák Stavby s.r.o.',
    contactName: 'Martin Novák',
    email: 'novak@novakstavby.sk',
    phone: '+421 907 222 333',
    ico: '47123890',
    dic: '2023456789',
    icDph: 'SK2023456789',
    legalForm: 'sro',
    vatPayer: true,
    note: 'Stavebná firma, 8 zamestnancov',
  },
  {
    id: 'c3',
    name: 'Kaviareň Pod Lipou s.r.o.',
    contactName: 'Zuzana Bieliková',
    email: 'zuzana@podlipou.sk',
    phone: '+421 911 444 555',
    ico: '53987412',
    dic: '2121098765',
    icDph: 'SK2121098765',
    legalForm: 'sro',
    vatPayer: true,
    note: 'Kaviareň, registračná pokladnica eKasa',
  },
  {
    id: 'c4',
    name: 'Elena Tóthová',
    contactName: 'Elena Tóthová',
    email: 'elena.tothova@email.sk',
    phone: '+421 902 666 777',
    ico: '45678123',
    dic: '1045678123',
    legalForm: 'szco',
    vatPayer: false,
    note: 'Kaderníctvo, neplatiteľ DPH',
  },
  {
    id: 'c5',
    name: 'GreenTech Solutions s.r.o.',
    contactName: 'Tomáš Varga',
    email: 'tomas.varga@greentech.sk',
    phone: '+421 948 111 222',
    ico: '52345678',
    dic: '2120987654',
    icDph: 'SK2120987654',
    legalForm: 'sro',
    vatPayer: true,
    note: 'Montáž fotovoltiky',
  },
  {
    id: 'c6',
    name: 'Ján Mráz – Mráz Transport',
    contactName: 'Ján Mráz',
    email: 'jan.mraz@mraztransport.sk',
    phone: '+421 915 888 999',
    ico: '46789012',
    dic: '1046789012',
    icDph: 'SK1046789012',
    legalForm: 'szco',
    vatPayer: true,
    note: 'Vnútroštátna nákladná doprava, 2 vozidlá',
  },
]

// Fiktívne identifikačné údaje dodávateľov (len pre demo)
const SUPPLIERS = {
  orange: { name: 'Orange Slovensko, a.s.', ico: '35697270', dic: '2020310578' },
  telekom: { name: 'Slovak Telekom, a.s.', ico: '35763469', dic: '2020273893' },
  alza: { name: 'Alza.sk s.r.o.', ico: '36562939', dic: '2021863811' },
  zse: { name: 'ZSE Energia, a.s.', ico: '36677281', dic: '2022249295' },
  slovnaft: { name: 'SLOVNAFT, a.s.', ico: '31322832', dic: '2020372640' },
  dek: { name: 'Stavebniny DEK s.r.o.', ico: '36443409', dic: '2021960897' },
  metro: { name: 'METRO Cash & Carry SR s.r.o.', ico: '45952671', dic: '2023164320' },
  office: { name: 'Business Centrum Nivy s.r.o.', ico: '50112233', dic: '2120334455' },
  lizing: { name: 'VÚB Leasing, a. s.', ico: '31318414', dic: '2020408522' },
  solar: { name: 'SolarParts Europe s.r.o.', ico: '51998877', dic: '2120776655' },
  bank: { name: 'Tatra banka, a.s.', ico: '00686930', dic: '2020408523' },
}

type SupplierKey = keyof typeof SUPPLIERS

function inv(
  s: SupplierKey,
  invoiceNumber: string,
  issueDate: string,
  total: number,
  description: string,
  vatRate = 23,
): InvoiceData {
  const sup = SUPPLIERS[s]
  const base = vatRate ? Math.round((total / (1 + vatRate / 100)) * 100) / 100 : total
  return {
    supplierName: sup.name,
    supplierIco: sup.ico,
    supplierDic: sup.dic,
    invoiceNumber,
    variableSymbol: invoiceNumber.replace(/\D/g, '').slice(-10),
    issueDate,
    dueDate: addDays(issueDate, 14).slice(0, 10),
    taxDate: issueDate,
    base,
    vatRate,
    vat: Math.round((total - base) * 100) / 100,
    total,
    currency: 'EUR',
    description,
  }
}

export const emptyInvoiceData = (): InvoiceData => ({
  supplierName: '',
  supplierIco: '',
  supplierDic: '',
  invoiceNumber: '',
  variableSymbol: '',
  issueDate: '',
  dueDate: '',
  taxDate: '',
  base: 0,
  vatRate: 23,
  vat: 0,
  total: 0,
  currency: 'EUR',
  description: '',
})

function doc(
  id: string,
  clientId: string,
  requestId: string | undefined,
  fileName: string,
  kind: DocumentKind,
  uploadedAt: string,
  status: Document['status'],
  data: InvoiceData,
): Document {
  return {
    id,
    clientId,
    requestId,
    fileName,
    fileType: fileName.endsWith('.pdf') ? 'pdf' : 'image',
    fileSize: 80_000 + ((id.charCodeAt(1) * 7919 + id.length * 104729) % 900_000),
    kind,
    uploadedAt,
    uploadedBy: 'client',
    status,
    reviewedAt: status !== 'uploaded' ? addDays(uploadedAt, 1) : undefined,
    exportedAt: status === 'exported' ? addDays(uploadedAt, 2) : undefined,
    data,
  }
}

const documents: Document[] = [
  // Peter Kováč
  doc('d1', 'c1', 'r3', 'vypis_tatrabanka_2026-09.pdf', 'bank_statement', '2026-10-02T18:40', 'reviewed', {
    ...emptyInvoiceData(),
    supplierName: SUPPLIERS.bank.name,
    supplierIco: SUPPLIERS.bank.ico,
    invoiceNumber: 'VYPIS-09/2026',
    issueDate: '2026-09-30',
    taxDate: '2026-09-30',
    vatRate: 0,
    description: 'Bankový výpis za september 2026',
  }),
  doc('d2', 'c1', 'r4', 'faktura_najom_kancelaria_09.pdf', 'received_invoice', '2026-10-08T20:12', 'uploaded',
    inv('office', 'FV2026-0912', '2026-09-30', 492.0, 'Prenájom kancelárie – september 2026')),
  doc('d3', 'c1', undefined, 'alza_monitor.jpg', 'received_invoice', '2026-09-12T11:03', 'exported',
    inv('alza', '2026112233', '2026-09-11', 289.9, 'Monitor Dell 27"')),
  // Novák Stavby
  doc('d4', 'c2', 'r6', 'DEK_faktura_88412.pdf', 'received_invoice', '2026-09-26T07:55', 'exported',
    inv('dek', 'FA88412', '2026-09-24', 3843.75, 'Stavebný materiál – zákazka Rovinka')),
  doc('d5', 'c2', undefined, 'slovnaft_tankovanie_0915.jpg', 'receipt', '2026-09-16T17:20', 'exported',
    inv('slovnaft', 'P-0915-4471', '2026-09-15', 96.4, 'Pohonné hmoty – nafta')),
  // Kaviareň Pod Lipou
  doc('d6', 'c3', 'r7', 'metro_blocok_0903.jpg', 'receipt', '2026-10-07T21:30', 'uploaded',
    inv('metro', 'MCC-0903-11823', '2026-09-03', 412.36, 'Tovar na predaj – káva, mlieko')),
  doc('d7', 'c3', 'r7', 'metro_blocok_0917.jpg', 'receipt', '2026-10-07T21:31', 'uploaded',
    inv('metro', 'MCC-0917-12011', '2026-09-17', 388.12, 'Tovar na predaj – káva, sirupy')),
  doc('d8', 'c3', 'r7', 'ekasa_uzavierka_09.pdf', 'other', '2026-10-07T21:33', 'uploaded', {
    ...emptyInvoiceData(),
    supplierName: 'Kaviareň Pod Lipou s.r.o.',
    invoiceNumber: 'UZ-09/2026',
    issueDate: '2026-09-30',
    taxDate: '2026-09-30',
    description: 'Mesačná uzávierka eKasa – tržby september',
  }),
  doc('d9', 'c3', 'r9', 'vypis_slsp_2026-09.pdf', 'bank_statement', '2026-10-01T10:02', 'reviewed', {
    ...emptyInvoiceData(),
    supplierName: 'Slovenská sporiteľňa, a.s.',
    invoiceNumber: 'VYPIS-09/2026',
    issueDate: '2026-09-30',
    taxDate: '2026-09-30',
    vatRate: 0,
    description: 'Bankový výpis za september 2026',
  }),
  // Elena Tóthová
  doc('d10', 'c4', 'r10', 'zse_elektrina_q3.pdf', 'received_invoice', '2026-10-05T19:45', 'reviewed',
    inv('zse', '7012345678', '2026-09-28', 186.5, 'Elektrina – vyúčtovanie Q3 2026')),
  // GreenTech Solutions
  doc('d11', 'c5', 'r11', 'solarparts_FA-26-0981.pdf', 'received_invoice', '2026-10-03T08:15', 'reviewed',
    inv('solar', 'FA-26-0981', '2026-09-22', 12480.0, 'Fotovoltické panely 24 ks, striedač')),
  doc('d12', 'c5', 'r11', 'solarparts_FA-26-1002.pdf', 'received_invoice', '2026-10-03T08:16', 'reviewed',
    inv('solar', 'FA-26-1002', '2026-09-29', 3175.2, 'Montážny materiál – konštrukcie')),
  doc('d13', 'c5', 'r11', 'telekom_09_2026.pdf', 'received_invoice', '2026-10-03T08:17', 'reviewed',
    inv('telekom', '6012998877', '2026-09-30', 73.8, 'Mobilné služby – september')),
  doc('d14', 'c5', 'r11', 'orange_internet_09.pdf', 'received_invoice', '2026-10-03T08:18', 'exported',
    inv('orange', '1209876543', '2026-09-30', 34.99, 'Internet – september')),
  doc('d15', 'c5', 'r11', 'dek_FA88590.pdf', 'received_invoice', '2026-10-03T08:20', 'uploaded',
    inv('dek', 'FA88590', '2026-09-26', 645.78, 'Kotviaci materiál')),
  // Ján Mráz
  doc('d16', 'c6', 'r15', 'vub_leasing_09_2026.pdf', 'received_invoice', '2026-10-08T07:10', 'uploaded',
    inv('lizing', 'L-2026-0099123', '2026-09-30', 1150.0, 'Splátka lízingu – Mercedes Actros, september')),
  doc('d17', 'c6', undefined, 'slovnaft_0902.jpg', 'receipt', '2026-09-03T16:44', 'exported',
    inv('slovnaft', 'P-0902-1181', '2026-09-02', 612.3, 'Pohonné hmoty – nafta')),
]

type ReqInput = Partial<Request> &
  Pick<Request, 'id' | 'clientId' | 'type' | 'title' | 'description' | 'createdAt' | 'dueDate' | 'status'>

function req(r: ReqInput): Request {
  return {
    remindersEnabled: true,
    remindersSent: 0,
    accountantAlerted: false,
    documentIds: documents.filter((d) => d.requestId === r.id).map((d) => d.id),
    period: '2026-09',
    ...r,
  }
}

const requests: Request[] = [
  // Peter Kováč
  req({
    id: 'r1', clientId: 'c1', type: 'document', title: 'Faktúra od Orange za september',
    description: 'Prosím, nahrajte faktúru od Orange za mobilné služby za september. Nájdete ju v aplikácii Môj Orange alebo v emaili.',
    createdAt: '2026-10-01T10:00', dueDate: '2026-10-10', status: 'waiting_client', remindersSent: 1, lastReminderAt: '2026-10-04T08:00',
  }),
  req({
    id: 'r2', clientId: 'c1', type: 'question', title: 'Platba 1 250,00 € pre Alza.sk',
    description: 'Na bankovom výpise z 18. 9. je platba 1 250,00 € pre Alza.sk. Ide o nákup do firmy? Ak áno, nahrajte prosím faktúru, ak nie, stačí napísať „súkromné“.',
    createdAt: '2026-10-06T14:20', dueDate: '2026-10-13', status: 'waiting_client', amount: 1250,
  }),
  req({
    id: 'r3', clientId: 'c1', type: 'document', title: 'Bankový výpis za september',
    description: 'Prosím, nahrajte výpis z podnikateľského účtu za september 2026 (PDF z internet bankingu).',
    createdAt: '2026-10-01T10:00', dueDate: '2026-10-08', status: 'resolved', resolvedAt: '2026-10-03T09:12',
  }),
  req({
    id: 'r4', clientId: 'c1', type: 'document', title: 'Faktúra za prenájom kancelárie',
    description: 'Pošlite prosím faktúru za nájom kancelárie za september.',
    createdAt: '2026-10-05T09:30', dueDate: '2026-10-12', status: 'waiting_accountant',
  }),
  // Novák Stavby
  req({
    id: 'r5', clientId: 'c2', type: 'document', title: 'Doklady za september',
    description: 'Prosím, nahrajte všetky prijaté a vydané faktúry za september, bankový výpis a bločky za PHM.',
    createdAt: '2026-09-30T08:00', dueDate: '2026-10-07', status: 'waiting_client', remindersSent: 2, lastReminderAt: '2026-10-07T08:00',
  }),
  req({
    id: 'r6', clientId: 'c2', type: 'question', title: 'Chýbajúca faktúra – Stavebniny DEK',
    description: 'Na výpise je platba 3 843,75 € pre Stavebniny DEK, ale faktúru nemám. Môžete ju prosím poslať?',
    createdAt: '2026-09-24T11:00', dueDate: '2026-10-01', status: 'resolved', resolvedAt: '2026-09-27T08:30', amount: 3843.75,
  }),
  // Kaviareň Pod Lipou
  req({
    id: 'r7', clientId: 'c3', type: 'document', title: 'Bločky a uzávierka eKasa za september',
    description: 'Nahrajte prosím nákupné bločky (METRO a pod.) a mesačnú uzávierku z eKasy za september.',
    createdAt: '2026-10-01T10:00', dueDate: '2026-10-10', status: 'waiting_accountant', remindersSent: 1, lastReminderAt: '2026-10-04T08:00',
  }),
  req({
    id: 'r8', clientId: 'c3', type: 'info', title: 'Počet zamestnancov k 30. 9.',
    description: 'Potrebujem vedieť počet zamestnancov k 30. 9. a či nastúpil niekto nový (kvôli mzdám a štatistike).',
    createdAt: '2026-10-07T15:00', dueDate: '2026-10-14', status: 'waiting_client',
  }),
  req({
    id: 'r9', clientId: 'c3', type: 'document', title: 'Bankový výpis za september',
    description: 'Prosím, nahrajte výpis z účtu za september 2026.',
    createdAt: '2026-09-30T08:00', dueDate: '2026-10-07', status: 'resolved', resolvedAt: '2026-10-01T12:00',
  }),
  // Elena Tóthová
  req({
    id: 'r10', clientId: 'c4', type: 'document', title: 'Výdavkové doklady za 3. štvrťrok',
    description: 'Nahrajte prosím všetky výdavkové doklady za júl až september (nákup materiálu, energie, nájom).',
    createdAt: '2026-10-02T09:00', dueDate: '2026-10-16', status: 'waiting_client', remindersSent: 1, lastReminderAt: '2026-10-05T08:00',
  }),
  // GreenTech
  req({
    id: 'r11', clientId: 'c5', type: 'document', title: 'Faktúry od dodávateľov za september',
    description: 'Nahrajte prosím všetky prijaté faktúry za september.',
    createdAt: '2026-10-01T10:00', dueDate: '2026-10-08', status: 'resolved', resolvedAt: '2026-10-04T10:00',
  }),
  req({
    id: 'r12', clientId: 'c5', type: 'question', title: 'Prijatá platba 4 800,00 € od Danubia Media',
    description: 'Dňa 21. 9. prišla na účet platba 4 800,00 € od Danubia Media s.r.o. Neviem ju spárovať so žiadnou vydanou faktúrou. Za čo bola?',
    createdAt: '2026-10-05T13:00', dueDate: '2026-10-12', status: 'waiting_accountant', amount: 4800,
  }),
  req({
    id: 'r13', clientId: 'c5', type: 'document', title: 'Zmluva s novým odberateľom',
    description: 'Prosím, nahrajte podpísanú zmluvu s Danubia Media, aby som vedela správne zaúčtovať zálohu.',
    createdAt: '2026-10-08T16:00', dueDate: '2026-10-15', status: 'waiting_client',
  }),
  // Ján Mráz
  req({
    id: 'r14', clientId: 'c6', type: 'document', title: 'Tankovacie bločky za september',
    description: 'Prosím, nahrajte všetky bločky za naftu za september (aj fotky z mobilu stačia).',
    createdAt: '2026-09-28T09:00', dueDate: '2026-10-06', status: 'waiting_client', remindersSent: 2, lastReminderAt: '2026-10-05T08:00', accountantAlerted: true,
  }),
  req({
    id: 'r15', clientId: 'c6', type: 'document', title: 'Faktúra za lízing – september',
    description: 'Pošlite prosím faktúru od VÚB Leasing za septembrovú splátku.',
    createdAt: '2026-10-02T09:00', dueDate: '2026-10-09', status: 'waiting_accountant',
  }),
]

const comments: Comment[] = [
  { id: 'm1', requestId: 'r2', author: 'accountant', text: 'Dobrý deň, len doplním – variabilný symbol platby je 2026118870.', createdAt: '2026-10-06T14:22' },
  { id: 'm2', requestId: 'r4', author: 'client', text: 'Posielam, prepáčte za meškanie.', createdAt: '2026-10-08T20:12', documentIds: ['d2'] },
  { id: 'm3', requestId: 'r5', author: 'client', text: 'Budúci týždeň všetko pošlem, teraz sme na stavbe.', createdAt: '2026-10-03T19:05' },
  { id: 'm4', requestId: 'r5', author: 'accountant', text: 'Rozumiem, ale kvôli DPH to potrebujem najneskôr do 15. 10. Ďakujem.', createdAt: '2026-10-04T08:30' },
  { id: 'm5', requestId: 'r7', author: 'client', text: 'Nahrala som dva bločky z METRA a uzávierku. Viac nákupov sme nemali.', createdAt: '2026-10-07T21:34', documentIds: ['d6', 'd7', 'd8'] },
  { id: 'm6', requestId: 'r12', author: 'client', text: 'To je záloha 40 % na fotovoltiku pre ich sklad. Zmluvu ešte nemám podpísanú, dodám.', createdAt: '2026-10-06T10:41' },
  { id: 'm7', requestId: 'r14', author: 'accountant', text: 'Pán Mráz, bez bločkov neviem uplatniť DPH za naftu. Prosím aspoň fotky.', createdAt: '2026-10-06T09:00' },
  { id: 'm8', requestId: 'r15', author: 'client', text: 'Faktúra v prílohe.', createdAt: '2026-10-08T07:10', documentIds: ['d16'] },
  { id: 'm9', requestId: 'r6', author: 'client', text: 'Tu je, bola v inej schránke.', createdAt: '2026-09-26T07:55', documentIds: ['d4'] },
  { id: 'm10', requestId: 'r3', author: 'client', text: 'Výpis v prílohe.', createdAt: '2026-10-02T18:40', documentIds: ['d1'] },
  { id: 'm11', requestId: 'r9', author: 'client', text: 'Posielam výpis.', createdAt: '2026-10-01T10:02', documentIds: ['d9'] },
  { id: 'm12', requestId: 'r11', author: 'client', text: 'Všetky faktúry za september.', createdAt: '2026-10-03T08:20', documentIds: ['d11', 'd12', 'd13', 'd14', 'd15'] },
]

function buildHistory() {
  let evCounter = 0
  let msgCounter = 0
  const events: HistoryEvent[] = []
  const messages: ClientMessage[] = []
  const ev = (e: Omit<HistoryEvent, 'id'>) => events.push({ id: `e${++evCounter}`, ...e })

  for (const r of requests) {
    ev({ clientId: r.clientId, requestId: r.id, type: 'request_created', actor: 'accountant', text: `Vytvorená požiadavka „${r.title}“`, at: r.createdAt })
    messages.push({
      id: `cm${++msgCounter}`, clientId: r.clientId, requestId: r.id, kind: 'new_request',
      subject: `Nová požiadavka: ${r.title}`,
      body: `Dobrý deň,\n\nvaša účtovníčka od vás potrebuje: ${r.description}\n\nOdpovedať môžete cez odkaz nižšie, bez prihlasovania.`,
      at: r.createdAt, read: r.status === 'resolved' || r.clientId !== 'c1',
    })
    for (let i = 1; i <= r.remindersSent; i++) {
      const at = i === r.remindersSent && r.lastReminderAt ? r.lastReminderAt : addDays(r.createdAt.slice(0, 10) + 'T08:00', 3)
      ev({ clientId: r.clientId, requestId: r.id, type: 'reminder_sent', actor: 'system', text: `Automatická pripomienka č. ${i} odoslaná klientovi`, at })
      messages.push({
        id: `cm${++msgCounter}`, clientId: r.clientId, requestId: r.id, kind: 'reminder',
        subject: `Pripomienka: ${r.title}`,
        body: `Dobrý deň,\n\npripomíname, že vaša účtovníčka stále čaká na: ${r.title}. Termín: ${formatDate(r.dueDate)}.`,
        at, read: r.clientId !== 'c1',
      })
    }
    if (r.accountantAlerted) {
      ev({ clientId: r.clientId, requestId: r.id, type: 'accountant_alerted', actor: 'system', text: 'Klient nereaguje ani po 2 pripomienkach – upozornenie účtovníčke', at: '2026-10-08T08:00' })
    }
    for (const c of comments.filter((c) => c.requestId === r.id)) {
      if (c.documentIds?.length) {
        const n = c.documentIds.length
        ev({ clientId: r.clientId, requestId: r.id, type: 'client_uploaded', actor: 'client', text: `Klient nahral ${n === 1 ? '1 doklad' : n < 5 ? `${n} doklady` : `${n} dokladov`}`, at: c.createdAt })
      } else {
        ev({
          clientId: r.clientId, requestId: r.id, type: c.author === 'client' ? 'client_replied' : 'comment', actor: c.author,
          text: c.author === 'client' ? 'Klient odpovedal' : 'Účtovníčka pridala komentár', at: c.createdAt,
        })
      }
    }
    if (r.status === 'resolved' && r.resolvedAt) {
      ev({ clientId: r.clientId, requestId: r.id, type: 'request_resolved', actor: 'accountant', text: 'Požiadavka vyriešená', at: r.resolvedAt })
    }
  }
  for (const d of documents) {
    if (!d.requestId) {
      ev({ clientId: d.clientId, documentId: d.id, type: 'client_uploaded', actor: 'client', text: `Klient nahral ${d.fileName}`, at: d.uploadedAt })
    }
    if (d.reviewedAt) ev({ clientId: d.clientId, documentId: d.id, requestId: d.requestId, type: 'document_approved', actor: 'accountant', text: `Doklad ${d.fileName} skontrolovaný`, at: d.reviewedAt })
    if (d.exportedAt) ev({ clientId: d.clientId, documentId: d.id, requestId: d.requestId, type: 'document_exported', actor: 'accountant', text: `Doklad ${d.fileName} exportovaný do Pohody`, at: d.exportedAt })
  }
  events.sort((a, b) => a.at.localeCompare(b.at))
  messages.sort((a, b) => b.at.localeCompare(a.at))
  return { events, messages }
}

const accountantNotifications: AccountantNotification[] = [
  { id: 'n1', clientId: 'c1', requestId: 'r4', documentId: 'd2', text: 'Peter Kováč nahral faktúru za prenájom kancelárie', at: '2026-10-08T20:12', read: false },
  { id: 'n2', clientId: 'c6', requestId: 'r14', text: 'Ján Mráz nereaguje na „Tankovacie bločky za september“ ani po 2 pripomienkach', at: '2026-10-08T08:00', read: false },
  { id: 'n3', clientId: 'c6', requestId: 'r15', documentId: 'd16', text: 'Ján Mráz nahral faktúru za lízing', at: '2026-10-08T07:10', read: false },
  { id: 'n4', clientId: 'c3', requestId: 'r7', text: 'Zuzana Bieliková nahrala 3 doklady k „Bločky a uzávierka eKasa za september“', at: '2026-10-07T21:34', read: true },
  { id: 'n5', clientId: 'c5', requestId: 'r12', text: 'Tomáš Varga odpovedal na otázku k platbe 4 800,00 €', at: '2026-10-06T10:41', read: true },
]

export function createSeedState(): AppState {
  const { events, messages } = buildHistory()
  return {
    version: STATE_VERSION,
    today: TODAY,
    accountant: {
      name: 'Jana Horváthová',
      firstName: 'Jana',
      office: 'Účtovníctvo Horváthová',
      email: 'jana@uctovnictvo-horvathova.sk',
    },
    clients: structuredClone(clients),
    requests: structuredClone(requests),
    comments: structuredClone(comments),
    events,
    documents: structuredClone(documents),
    accountantNotifications: structuredClone(accountantNotifications),
    clientMessages: messages,
    settings: { firstReminderDays: 3, secondReminderDays: 7, alertAccountantDays: 10 },
    role: 'accountant',
    portalClientId: 'c1',
  }
}
