import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AppState,
  ClientMessage,
  Document,
  HistoryEvent,
  InvoiceData,
  Request,
  RequestType,
  Settings,
} from '../data/types'
import { createSeedState, emptyInvoiceData, STATE_VERSION } from '../data/seed'
import { addDays, daysBetween, formatDate, uid } from '../lib/format'

const STORAGE_KEY = 'cisielka-demo-state'

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.version === STATE_VERSION) return parsed
    }
  } catch {
    /* ignore */
  }
  return createSeedState()
}

export interface NewRequestInput {
  clientId: string
  type: RequestType
  title: string
  description: string
  dueDate: string
  remindersEnabled: boolean
  period?: string
  amount?: number
}

export interface UploadInput {
  file: File
}

interface Actions {
  setRole: (role: AppState['role']) => void
  setPortalClient: (clientId: string) => void
  createRequest: (input: NewRequestInput) => string
  /** Účtovník alebo klient pridá komentár do vlákna požiadavky */
  addComment: (requestId: string, author: 'accountant' | 'client', text: string) => void
  /** Klient nahrá súbory k požiadavke (ešte neodovzdá) – vráti id nových dokladov */
  uploadFiles: (requestId: string, files: File[]) => Promise<string[]>
  /** Klient odstráni doklad, ktorý ešte nebol skontrolovaný */
  removeDocument: (documentId: string) => void
  /** Klient odovzdá požiadavku účtovníkovi (voliteľne s textovou odpoveďou) */
  submitRequest: (requestId: string, replyText?: string) => void
  resolveRequest: (requestId: string) => void
  reopenRequest: (requestId: string, comment?: string) => void
  remindNow: (requestId: string) => void
  updateDocumentData: (documentId: string, data: Partial<InvoiceData>, kind?: Document['kind']) => void
  approveDocument: (documentId: string) => void
  unapproveDocument: (documentId: string) => void
  markExported: (documentIds: string[]) => void
  markAccountantNotificationsRead: () => void
  markClientMessagesRead: (clientId: string) => void
  updateSettings: (s: Settings) => void
  /** Posunie simulovaný čas o deň a spustí automatické pripomienky */
  advanceDay: () => { reminders: number; alerts: number }
  resetDemo: () => void
}

type Store = { state: AppState } & Actions

const Ctx = createContext<Store | null>(null)

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function guessKind(fileName: string, req?: Request): Document['kind'] {
  const n = fileName.toLowerCase()
  if (n.includes('vypis') || n.includes('výpis') || n.includes('statement')) return 'bank_statement'
  if (n.includes('blok') || n.includes('bloc') || n.includes('uctenk')) return 'receipt'
  if (req?.title.toLowerCase().includes('výpis')) return 'bank_statement'
  if (req?.title.toLowerCase().includes('bloč')) return 'receipt'
  return 'received_invoice'
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage plný (veľké nahraté súbory) – uložíme bez obsahu súborov
      try {
        const slim = { ...state, documents: state.documents.map((d) => ({ ...d, fileUrl: d.fileUrl?.startsWith('data:') ? undefined : d.fileUrl })) }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
      } catch {
        /* ignore */
      }
    }
  }, [state])

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), [])

  const actions = useMemo<Actions>(() => {
    const event = (s: AppState, e: Omit<HistoryEvent, 'id' | 'at'>): HistoryEvent => ({ id: uid('e'), at: s.today, ...e })
    const clientMessage = (s: AppState, m: Omit<ClientMessage, 'id' | 'at' | 'read'>): ClientMessage => ({ id: uid('cm'), at: s.today, read: false, ...m })
    const clientFirstName = (s: AppState, clientId: string) => s.clients.find((c) => c.id === clientId)?.contactName ?? ''

    return {
      setRole: (role) => update((s) => ({ ...s, role })),
      setPortalClient: (portalClientId) => update((s) => ({ ...s, portalClientId })),

      createRequest: (input) => {
        const id = uid('r')
        update((s) => {
          const r: Request = {
            id,
            clientId: input.clientId,
            type: input.type,
            title: input.title,
            description: input.description,
            period: input.period,
            createdAt: s.today,
            dueDate: input.dueDate,
            status: 'waiting_client',
            remindersEnabled: input.remindersEnabled,
            remindersSent: 0,
            accountantAlerted: false,
            documentIds: [],
            amount: input.amount,
          }
          return {
            ...s,
            requests: [r, ...s.requests],
            events: [...s.events, event(s, { clientId: r.clientId, requestId: id, type: 'request_created', actor: 'accountant', text: `Vytvorená požiadavka „${r.title}“` })],
            clientMessages: [
              clientMessage(s, {
                clientId: r.clientId,
                requestId: id,
                kind: 'new_request',
                subject: `Nová požiadavka: ${r.title}`,
                body: `Dobrý deň,\n\nvaša účtovníčka od vás potrebuje: ${r.description}\n\nTermín: ${formatDate(r.dueDate)}. Odpovedať môžete cez odkaz nižšie, bez prihlasovania.`,
              }),
              ...s.clientMessages,
            ],
          }
        })
        return id
      },

      addComment: (requestId, author, text) =>
        update((s) => {
          const r = s.requests.find((x) => x.id === requestId)
          if (!r) return s
          const next: AppState = {
            ...s,
            comments: [...s.comments, { id: uid('m'), requestId, author, text, createdAt: s.today }],
            events: [
              ...s.events,
              event(s, {
                clientId: r.clientId,
                requestId,
                type: author === 'client' ? 'client_replied' : 'comment',
                actor: author,
                text: author === 'client' ? 'Klient napísal správu' : 'Účtovníčka pridala komentár',
              }),
            ],
          }
          if (author === 'accountant') {
            next.clientMessages = [
              clientMessage(s, { clientId: r.clientId, requestId, kind: 'comment', subject: `Nová správa k: ${r.title}`, body: text }),
              ...s.clientMessages,
            ]
          } else {
            next.accountantNotifications = [
              { id: uid('n'), clientId: r.clientId, requestId, text: `${clientFirstName(s, r.clientId)} napísal(a) správu k „${r.title}“`, at: s.today, read: false },
              ...s.accountantNotifications,
            ]
          }
          return next
        }),

      uploadFiles: async (requestId, files) => {
        const prepared = await Promise.all(
          files.map(async (file) => ({
            file,
            // malé súbory uložíme ako data URL (prežijú refresh), veľké len ako blob URL
            url: file.size < 1_500_000 ? await fileToDataUrl(file) : URL.createObjectURL(file),
          })),
        )
        const ids = prepared.map(() => uid('d'))
        update((s) => {
          const r = s.requests.find((x) => x.id === requestId)
          if (!r) return s
          const docs: Document[] = prepared.map(({ file, url }, i) => ({
            id: ids[i],
            clientId: r.clientId,
            requestId,
            fileName: file.name,
            fileType: file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
            fileSize: file.size,
            fileUrl: url,
            kind: guessKind(file.name, r),
            uploadedAt: s.today,
            uploadedBy: 'client',
            status: 'uploaded',
            data: { ...emptyInvoiceData(), description: r.title },
          }))
          return {
            ...s,
            documents: [...docs, ...s.documents],
            requests: s.requests.map((x) => (x.id === requestId ? { ...x, documentIds: [...x.documentIds, ...ids] } : x)),
            events: [
              ...s.events,
              ...docs.map((d) => event(s, { clientId: r.clientId, requestId, documentId: d.id, type: 'client_uploaded', actor: 'client', text: `Klient nahral ${d.fileName}` })),
            ],
          }
        })
        return ids
      },

      removeDocument: (documentId) =>
        update((s) => ({
          ...s,
          documents: s.documents.filter((d) => d.id !== documentId),
          requests: s.requests.map((r) => ({ ...r, documentIds: r.documentIds.filter((id) => id !== documentId) })),
        })),

      submitRequest: (requestId, replyText) =>
        update((s) => {
          const r = s.requests.find((x) => x.id === requestId)
          if (!r) return s
          const newDocs = s.documents.filter((d) => d.requestId === requestId && d.status === 'uploaded' && d.uploadedAt === s.today)
          const parts: string[] = []
          if (newDocs.length) parts.push(newDocs.length === 1 ? '1 doklad' : `${newDocs.length} doklady`)
          if (replyText) parts.push('odpoveď')
          const name = clientFirstName(s, r.clientId)
          return {
            ...s,
            requests: s.requests.map((x) => (x.id === requestId ? { ...x, status: 'waiting_accountant' } : x)),
            comments: replyText
              ? [...s.comments, { id: uid('m'), requestId, author: 'client', text: replyText, createdAt: s.today, documentIds: newDocs.map((d) => d.id) }]
              : newDocs.length
                ? [...s.comments, { id: uid('m'), requestId, author: 'client', text: 'Odovzdané.', createdAt: s.today, documentIds: newDocs.map((d) => d.id) }]
                : s.comments,
            events: [...s.events, event(s, { clientId: r.clientId, requestId, type: 'client_submitted', actor: 'client', text: `Klient odovzdal ${parts.join(' a ') || 'požiadavku'}` })],
            accountantNotifications: [
              { id: uid('n'), clientId: r.clientId, requestId, text: `${name} odovzdal(a) ${parts.join(' a ') || 'požiadavku'} k „${r.title}“`, at: s.today, read: false },
              ...s.accountantNotifications,
            ],
          }
        }),

      resolveRequest: (requestId) =>
        update((s) => {
          const r = s.requests.find((x) => x.id === requestId)
          if (!r) return s
          return {
            ...s,
            requests: s.requests.map((x) => (x.id === requestId ? { ...x, status: 'resolved', resolvedAt: s.today } : x)),
            events: [...s.events, event(s, { clientId: r.clientId, requestId, type: 'request_resolved', actor: 'accountant', text: 'Požiadavka vyriešená' })],
            clientMessages: [
              clientMessage(s, { clientId: r.clientId, requestId, kind: 'resolved', subject: `Vybavené: ${r.title}`, body: 'Ďakujeme, účtovníčka má všetko, čo potrebovala.' }),
              ...s.clientMessages,
            ],
          }
        }),

      reopenRequest: (requestId, comment) =>
        update((s) => {
          const r = s.requests.find((x) => x.id === requestId)
          if (!r) return s
          return {
            ...s,
            requests: s.requests.map((x) => (x.id === requestId ? { ...x, status: 'waiting_client', resolvedAt: undefined } : x)),
            comments: comment ? [...s.comments, { id: uid('m'), requestId, author: 'accountant', text: comment, createdAt: s.today }] : s.comments,
            events: [...s.events, event(s, { clientId: r.clientId, requestId, type: 'request_reopened', actor: 'accountant', text: 'Požiadavka vrátená klientovi na doplnenie' })],
            clientMessages: [
              clientMessage(s, { clientId: r.clientId, requestId, kind: 'comment', subject: `Treba doplniť: ${r.title}`, body: comment || 'Účtovníčka potrebuje k požiadavke ešte niečo doplniť.' }),
              ...s.clientMessages,
            ],
          }
        }),

      remindNow: (requestId) =>
        update((s) => {
          const r = s.requests.find((x) => x.id === requestId)
          if (!r) return s
          return {
            ...s,
            requests: s.requests.map((x) => (x.id === requestId ? { ...x, lastReminderAt: s.today } : x)),
            events: [...s.events, event(s, { clientId: r.clientId, requestId, type: 'reminder_sent', actor: 'accountant', text: 'Manuálna pripomienka odoslaná klientovi' })],
            clientMessages: [
              clientMessage(s, { clientId: r.clientId, requestId, kind: 'reminder', subject: `Pripomienka: ${r.title}`, body: `Dobrý deň,\n\nvaša účtovníčka stále čaká na: ${r.title}. Termín: ${formatDate(r.dueDate)}.` }),
              ...s.clientMessages,
            ],
          }
        }),

      updateDocumentData: (documentId, data, kind) =>
        update((s) => ({
          ...s,
          documents: s.documents.map((d) => (d.id === documentId ? { ...d, kind: kind ?? d.kind, data: { ...d.data, ...data } } : d)),
        })),

      approveDocument: (documentId) =>
        update((s) => {
          const d = s.documents.find((x) => x.id === documentId)
          if (!d) return s
          return {
            ...s,
            documents: s.documents.map((x) => (x.id === documentId ? { ...x, status: 'reviewed', reviewedAt: s.today } : x)),
            events: [...s.events, event(s, { clientId: d.clientId, requestId: d.requestId, documentId, type: 'document_approved', actor: 'accountant', text: `Doklad ${d.fileName} skontrolovaný` })],
          }
        }),

      unapproveDocument: (documentId) =>
        update((s) => ({
          ...s,
          documents: s.documents.map((x) => (x.id === documentId ? { ...x, status: 'uploaded', reviewedAt: undefined } : x)),
        })),

      markExported: (documentIds) =>
        update((s) => {
          const set = new Set(documentIds)
          return {
            ...s,
            documents: s.documents.map((x) => (set.has(x.id) ? { ...x, status: 'exported', exportedAt: s.today } : x)),
            events: [
              ...s.events,
              ...s.documents
                .filter((d) => set.has(d.id))
                .map((d) => event(s, { clientId: d.clientId, requestId: d.requestId, documentId: d.id, type: 'document_exported', actor: 'accountant', text: `Doklad ${d.fileName} exportovaný do Pohody` })),
            ],
          }
        }),

      markAccountantNotificationsRead: () =>
        update((s) => ({ ...s, accountantNotifications: s.accountantNotifications.map((n) => ({ ...n, read: true })) })),

      markClientMessagesRead: (clientId) =>
        update((s) => ({ ...s, clientMessages: s.clientMessages.map((m) => (m.clientId === clientId ? { ...m, read: true } : m)) })),

      updateSettings: (settings) => update((s) => ({ ...s, settings })),

      advanceDay: () => {
        let reminders = 0
        let alerts = 0
        {
          const prev = stateRef.current
          const s: AppState = { ...prev, today: addDays(prev.today.slice(0, 10) + 'T08:00', 1) }
          const { firstReminderDays, secondReminderDays, alertAccountantDays } = s.settings
          const events = [...s.events]
          const messages = [...s.clientMessages]
          const notifications = [...s.accountantNotifications]
          const requests = s.requests.map((r) => {
            if (r.status !== 'waiting_client' || !r.remindersEnabled) return r
            const age = daysBetween(r.createdAt, s.today)
            const next = { ...r }
            const thresholds = [firstReminderDays, secondReminderDays]
            while (next.remindersSent < 2 && age >= thresholds[next.remindersSent]) {
              next.remindersSent += 1
              next.lastReminderAt = s.today
              reminders += 1
              events.push(event(s, { clientId: r.clientId, requestId: r.id, type: 'reminder_sent', actor: 'system', text: `Automatická pripomienka č. ${next.remindersSent} odoslaná klientovi` }))
              messages.unshift(
                clientMessage(s, {
                  clientId: r.clientId,
                  requestId: r.id,
                  kind: 'reminder',
                  subject: `Pripomienka: ${r.title}`,
                  body: `Dobrý deň,\n\npripomíname, že vaša účtovníčka stále čaká na: ${r.title}. Termín: ${formatDate(r.dueDate)}.`,
                }),
              )
            }
            if (!next.accountantAlerted && age >= alertAccountantDays) {
              next.accountantAlerted = true
              alerts += 1
              events.push(event(s, { clientId: r.clientId, requestId: r.id, type: 'accountant_alerted', actor: 'system', text: 'Klient nereaguje ani po 2 pripomienkach – upozornenie účtovníčke' }))
              notifications.unshift({
                id: uid('n'),
                clientId: r.clientId,
                requestId: r.id,
                text: `${clientFirstName(s, r.clientId)} nereaguje na „${r.title}“ ani po 2 pripomienkach`,
                at: s.today,
                read: false,
              })
            }
            return next
          })
          const nextState = { ...s, requests, events, clientMessages: messages, accountantNotifications: notifications }
          stateRef.current = nextState
          setState(nextState)
        }
        return { reminders, alerts }
      },

      resetDemo: () => {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          /* ignore */
        }
        setState(createSeedState())
      },
    }
  }, [update])

  const value = useMemo(() => ({ state, ...actions }), [state, actions])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore musí byť v AppStoreProvider')
  return ctx
}

/* ---------- Odvodené hodnoty (selektory) ---------- */

export function isOverdue(r: Request, today: string) {
  return r.status === 'waiting_client' && daysBetween(r.dueDate, today) > 0
}

export type RequestDisplayStatus = 'waiting_client' | 'waiting_accountant' | 'resolved' | 'overdue'

export function requestDisplayStatus(r: Request, today: string): RequestDisplayStatus {
  return isOverdue(r, today) ? 'overdue' : r.status
}

/** Stav uzávierky klienta za obdobie: koľko požiadaviek je hotových / odovzdaných */
export function clientPeriodProgress(state: AppState, clientId: string, period = '2026-09') {
  const reqs = state.requests.filter((r) => r.clientId === clientId && r.period === period)
  const done = reqs.filter((r) => r.status !== 'waiting_client').length
  return { done, total: reqs.length }
}

export function lastClientActivity(state: AppState, clientId: string) {
  const evs = state.events.filter((e) => e.clientId === clientId)
  return evs.length ? evs.reduce((a, b) => (a.at > b.at ? a : b)) : undefined
}
