import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RequestType } from '../data/types'
import { useStore } from '../store/AppStore'
import { useToast } from './Toast'
import { Button, cn, Modal, REQUEST_TYPE_LABEL } from './ui'
import { addDays } from '../lib/format'
import { afterDays } from './accountantShared'

interface Template {
  label: string
  type: RequestType
  title: string
  description: string
  amount?: boolean
}

const TEMPLATES: Template[] = [
  {
    label: 'Bankový výpis za september',
    type: 'document',
    title: 'Bankový výpis za september',
    description: 'Prosím, nahrajte výpis z podnikateľského účtu za september 2026 (PDF z internet bankingu).',
  },
  {
    label: 'Faktúry od dodávateľov za september',
    type: 'document',
    title: 'Faktúry od dodávateľov za september',
    description: 'Nahrajte prosím všetky prijaté faktúry za september 2026 – stačí PDF z emailu alebo fotka z mobilu.',
  },
  {
    label: 'Bločky za PHM',
    type: 'document',
    title: 'Bločky za PHM – september',
    description: 'Prosím, nahrajte všetky bločky za pohonné hmoty za september. Stačia čitateľné fotky z mobilu.',
  },
  {
    label: 'Nejasná platba na výpise',
    type: 'question',
    title: 'Nejasná platba na výpise',
    description:
      'Na bankovom výpise je platba, ktorú neviem priradiť k žiadnemu dokladu. O akú platbu ide? Ak je to nákup do firmy, nahrajte prosím faktúru. Ak ide o súkromnú platbu, stačí napísať „súkromné“.',
    amount: true,
  },
  {
    label: 'Počet zamestnancov',
    type: 'info',
    title: 'Počet zamestnancov k 30. 9.',
    description: 'Potrebujem vedieť počet zamestnancov k 30. 9. 2026 a či v septembri niekto nastúpil alebo odišiel (kvôli mzdám a výkazom).',
  },
]

const TYPES: RequestType[] = ['document', 'question', 'info']

export function NewRequestModal({ open, onClose, defaultClientId }: { open: boolean; onClose: () => void; defaultClientId?: string }) {
  const { state, createRequest } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const { settings } = state

  const defaultDue = addDays(state.today, 7).slice(0, 10)
  const [clientId, setClientId] = useState(defaultClientId ?? '')
  const [type, setType] = useState<RequestType>('document')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(defaultDue)
  const [reminders, setReminders] = useState(true)
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setClientId(defaultClientId ?? '')
    setType('document')
    setTitle('')
    setDescription('')
    setAmount('')
    setDueDate(defaultDue)
    setReminders(true)
    setActiveTemplate(null)
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultClientId])

  const applyTemplate = (t: Template) => {
    setType(t.type)
    setTitle(t.title)
    setDescription(t.description)
    setActiveTemplate(t.label)
    setError('')
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!clientId) return setError('Vyberte klienta.')
    if (!title.trim()) return setError('Doplňte názov požiadavky.')
    const parsedAmount = amount.trim() ? Number(amount.replace(/\s/g, '').replace(',', '.')) : undefined
    const id = createRequest({
      clientId,
      type,
      title: title.trim(),
      description: description.trim() || title.trim(),
      dueDate,
      remindersEnabled: reminders,
      period: '2026-09',
      amount: type === 'question' && parsedAmount && !Number.isNaN(parsedAmount) ? parsedAmount : undefined,
    })
    toast('Požiadavka odoslaná klientovi')
    onClose()
    navigate(`/requests/${id}`)
  }

  const client = state.clients.find((c) => c.id === clientId)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nová požiadavka"
      description="Klient dostane email s odkazom, cez ktorý odpovie alebo nahrá doklady."
      width="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Zrušiť
          </Button>
          <Button variant="primary" onClick={() => submit()}>
            Odoslať klientovi
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="nr-client">
            Klient
          </label>
          <select id="nr-client" className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Vyberte klienta…</option>
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {client && <p className="mt-1 text-xs text-zinc-500">Email pôjde na {client.email}</p>}
        </div>

        <div>
          <span className="label">Šablóna</span>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => applyTemplate(t)}
                className={cn(
                  'rounded-md border px-2 py-1 text-xs transition-colors',
                  activeTemplate === t.label ? 'border-accent-600 bg-accent-50 text-accent-800' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Typ</span>
          <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'rounded px-3 py-1 text-sm transition-colors',
                  type === t ? 'bg-white font-medium text-zinc-900 shadow-xs ring-1 ring-zinc-200' : 'text-zinc-600 hover:text-zinc-900',
                )}
              >
                {REQUEST_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="nr-title">
            Názov
          </label>
          <input id="nr-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="napr. Faktúra od Orange za september" />
        </div>

        {type === 'question' && (
          <div className="max-w-[200px]">
            <label className="label" htmlFor="nr-amount">
              Suma platby (€)
            </label>
            <input id="nr-amount" className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
        )}

        <div>
          <label className="label" htmlFor="nr-desc">
            Popis pre klienta
          </label>
          <textarea
            id="nr-desc"
            className="input min-h-[96px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Čo presne potrebujete a kde to klient nájde."
          />
        </div>

        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <div>
            <label className="label" htmlFor="nr-due">
              Termín
            </label>
            <input id="nr-due" type="date" className="input num w-[160px]" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 pt-5">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-[#0f7266]" checked={reminders} onChange={(e) => setReminders(e.target.checked)} />
            <span>
              <span className="block text-sm font-medium text-zinc-800">Automaticky pripomínať</span>
              <span className="block text-xs text-zinc-500">
                1. pripomienka {afterDays(settings.firstReminderDays)}, 2. {afterDays(settings.secondReminderDays)}, potom upozorním vás.
              </span>
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
