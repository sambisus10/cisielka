import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '../../store/AppStore'
import { Button, Card, CardHeader, cn, PageHeader } from '../../components/ui'
import { useToast } from '../../components/Toast'

export default function Settings() {
  const { state, updateSettings } = useStore()
  const toast = useToast()
  const [first, setFirst] = useState(state.settings.firstReminderDays)
  const [second, setSecond] = useState(state.settings.secondReminderDays)
  const [alert, setAlert] = useState(state.settings.alertAccountantDays)

  useEffect(() => {
    setFirst(state.settings.firstReminderDays)
    setSecond(state.settings.secondReminderDays)
    setAlert(state.settings.alertAccountantDays)
  }, [state.settings])

  const valid = first >= 1 && second > first && alert > second
  const dirty = first !== state.settings.firstReminderDays || second !== state.settings.secondReminderDays || alert !== state.settings.alertAccountantDays

  const steps = [
    { day: 0, label: 'Požiadavka odoslaná', who: 'email klientovi' },
    { day: first, label: '1. pripomienka', who: 'email klientovi' },
    { day: second, label: '2. pripomienka', who: 'email klientovi' },
    { day: alert, label: 'Upozornenie', who: 'notifikácia vám' },
  ]

  return (
    <div className="max-w-3xl">
      <PageHeader title="Nastavenia" />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Automatické pripomienky" description="Platí pre všetky požiadavky so zapnutým pripomínaním, kým klient neodpovie." />
          <div className="space-y-5 px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField label="1. pripomienka po" value={first} onChange={setFirst} />
              <NumberField label="2. pripomienka po" value={second} onChange={setSecond} />
              <NumberField label="Upozorniť mňa po" value={alert} onChange={setAlert} />
            </div>

            <ol className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.label} className="relative pr-3">
                  <div className="flex items-center">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', i === steps.length - 1 ? 'bg-zinc-900' : 'bg-zinc-400')} />
                    {i < steps.length - 1 && <span className="ml-1 h-px flex-1 bg-zinc-200" />}
                  </div>
                  <p className="num mt-2 text-xs font-medium text-zinc-500">{s.day === 0 ? 'Deň 0' : `Deň ${s.day}`}</p>
                  <p className="text-sm font-medium text-zinc-900">{s.label}</p>
                  <p className="text-xs text-zinc-500">{s.who}</p>
                </li>
              ))}
            </ol>

            {!valid && <p className="text-sm text-red-600">Každý ďalší krok musí nasledovať neskôr ako predchádzajúci.</p>}
          </div>
          <div className="flex justify-end border-t border-zinc-200 bg-zinc-50/60 px-4 py-3">
            <Button
              variant="primary"
              disabled={!valid || !dirty}
              onClick={() => {
                updateSettings({ firstReminderDays: first, secondReminderDays: second, alertAccountantDays: alert })
                toast('Nastavenia uložené')
              }}
            >
              Uložiť
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Kancelária" />
          <dl className="divide-y divide-zinc-100 text-sm">
            <Row label="Názov">{state.accountant.office}</Row>
            <Row label="Účtovníčka">{state.accountant.name}</Row>
            <Row label="Email">{state.accountant.email}</Row>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Export" />
          <dl className="divide-y divide-zinc-100 text-sm">
            <Row label="Formát">POHODA XML (dataPack)</Row>
            <Row label="Obsah">Prijaté faktúry a pokladničné doklady po kontrole</Row>
          </dl>
          <p className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">
            Súbor importujete v Pohode cez Súbor → Dátová komunikácia → XML import/export.
          </p>
        </Card>
      </div>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={60}
          className="input num w-20"
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
        />
        <span className="text-sm text-zinc-600">dňoch</span>
      </div>
    </label>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 px-4 py-2.5">
      <dt className="w-32 shrink-0 text-zinc-500">{label}</dt>
      <dd className="text-zinc-900">{children}</dd>
    </div>
  )
}
