export type ISODate = string // 'YYYY-MM-DDTHH:mm' (simulovaný čas)

export interface Client {
  id: string
  name: string // obchodné meno
  contactName: string // kontaktná osoba (krstné meno sa použije v portáli)
  email: string
  phone: string
  ico: string
  dic: string
  icDph?: string
  legalForm: 'sro' | 'szco' // s.r.o. / živnostník
  vatPayer: boolean
  note?: string
}

export type RequestType = 'document' | 'question' | 'info'
export type RequestStatus = 'waiting_client' | 'waiting_accountant' | 'resolved'

export interface Request {
  id: string
  clientId: string
  type: RequestType
  title: string
  description: string
  period?: string // 'YYYY-MM' – účtovné obdobie, ku ktorému sa požiadavka viaže
  createdAt: ISODate
  dueDate: string // 'YYYY-MM-DD'
  status: RequestStatus
  remindersEnabled: boolean
  remindersSent: number // 0, 1, 2
  accountantAlerted: boolean
  lastReminderAt?: ISODate
  resolvedAt?: ISODate
  documentIds: string[]
  /** Pri type 'question' – napr. nejasná platba z výpisu */
  amount?: number
}

export interface Comment {
  id: string
  requestId: string
  author: 'accountant' | 'client'
  text: string
  createdAt: ISODate
  documentIds?: string[]
}

export type EventType =
  | 'request_created'
  | 'reminder_sent'
  | 'accountant_alerted'
  | 'client_uploaded'
  | 'client_replied'
  | 'client_submitted'
  | 'comment'
  | 'request_resolved'
  | 'request_reopened'
  | 'document_opened'
  | 'document_approved'
  | 'document_exported'

/** Záznam do histórie (audit log) */
export interface HistoryEvent {
  id: string
  clientId: string
  requestId?: string
  documentId?: string
  type: EventType
  actor: 'accountant' | 'client' | 'system'
  text: string
  at: ISODate
}

export type DocumentStatus = 'uploaded' | 'reviewed' | 'exported'
export type DocumentKind = 'received_invoice' | 'issued_invoice' | 'receipt' | 'bank_statement' | 'other'

export interface InvoiceData {
  supplierName: string
  supplierIco: string
  supplierDic: string
  invoiceNumber: string
  variableSymbol: string
  issueDate: string // YYYY-MM-DD
  dueDate: string
  taxDate: string // dátum zdaniteľného plnenia
  base: number // základ dane
  vatRate: number // 23, 19, 5, 0
  vat: number
  total: number
  currency: 'EUR'
  description: string
}

export interface Document {
  id: string
  clientId: string
  requestId?: string
  fileName: string
  fileType: 'pdf' | 'image'
  fileSize: number // bytes
  /** data: URL alebo blob: URL pre súbory nahrané v deme; ak chýba, zobrazí sa vygenerovaný náhľad z `data` */
  fileUrl?: string
  kind: DocumentKind
  uploadedAt: ISODate
  uploadedBy: 'client' | 'accountant'
  status: DocumentStatus
  reviewedAt?: ISODate
  exportedAt?: ISODate
  data: InvoiceData
}

export interface AccountantNotification {
  id: string
  clientId: string
  requestId?: string
  documentId?: string
  text: string
  at: ISODate
  read: boolean
}

/** Simulovaný email / push, ktorý "prišiel" klientovi */
export interface ClientMessage {
  id: string
  clientId: string
  requestId?: string
  kind: 'new_request' | 'reminder' | 'comment' | 'resolved'
  subject: string
  body: string
  at: ISODate
  read: boolean
}

export interface Settings {
  firstReminderDays: number
  secondReminderDays: number
  alertAccountantDays: number
}

export interface Accountant {
  name: string
  firstName: string
  office: string
  email: string
}

export interface AppState {
  version: number
  today: ISODate
  accountant: Accountant
  clients: Client[]
  requests: Request[]
  comments: Comment[]
  events: HistoryEvent[]
  documents: Document[]
  accountantNotifications: AccountantNotification[]
  clientMessages: ClientMessage[]
  settings: Settings
  /** UI stav dema */
  role: 'accountant' | 'client'
  portalClientId: string
}
