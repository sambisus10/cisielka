import { useNavigate } from 'react-router-dom'
import { FastForward, RotateCcw } from 'lucide-react'
import { useStore } from '../store/AppStore'
import { useToast } from './Toast'
import { cn } from './ui'
import { formatDate, plural } from '../lib/format'

const WEEKDAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota']

/** Lišta mimo produktu – ovládanie dema (rola, simulovaný čas, reset) */
export function DemoBar() {
  const { state, setRole, setPortalClient, advanceDay, resetDemo } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [y, m, d] = state.today.slice(0, 10).split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]

  const switchRole = (role: 'accountant' | 'client') => {
    setRole(role)
    navigate(role === 'accountant' ? '/' : '/portal')
  }

  const onAdvance = () => {
    const { reminders, alerts } = advanceDay()
    const parts: string[] = []
    if (reminders) parts.push(plural(reminders, 'automatická pripomienka odoslaná', 'automatické pripomienky odoslané', 'automatických pripomienok odoslaných'))
    if (alerts) parts.push(plural(alerts, 'upozornenie účtovníčke', 'upozornenia účtovníčke', 'upozornení účtovníčke'))
    toast(parts.length ? parts.join(', ') : 'Nový deň – žiadne pripomienky na odoslanie', parts.length ? 'success' : 'info')
  }

  return (
    <div className="sticky top-0 z-40 flex h-10 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-300">
      <span className="hidden font-medium uppercase tracking-wider text-zinc-500 sm:inline">Demo</span>
      <div className="flex rounded-md bg-zinc-800 p-0.5">
        {(['accountant', 'client'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => switchRole(r)}
            className={cn('rounded px-2.5 py-1 font-medium transition-colors', state.role === r ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100')}
          >
            {r === 'accountant' ? 'Účtovníčka' : 'Klient'}
          </button>
        ))}
      </div>
      {state.role === 'client' && (
        <select
          value={state.portalClientId}
          onChange={(e) => {
            setPortalClient(e.target.value)
            navigate('/portal')
          }}
          className="h-7 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-200 focus:outline-none"
        >
          {state.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.contactName}
              {c.legalForm === 'sro' ? ` (${c.name})` : ''}
            </option>
          ))}
        </select>
      )}
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-zinc-400 md:inline">
          Simulovaný dátum: <span className="num text-zinc-100">{weekday} {formatDate(state.today)}</span>
        </span>
        <button
          type="button"
          onClick={onAdvance}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 font-medium text-zinc-100 hover:bg-zinc-800"
          title="Posunie čas o deň a spustí automatické pripomienky"
        >
          <FastForward size={14} strokeWidth={1.75} />
          +1 deň
        </button>
        <button
          type="button"
          onClick={() => {
            resetDemo()
            navigate('/')
            toast('Demo dáta obnovené', 'info')
          }}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          title="Obnoviť pôvodné ukážkové dáta"
        >
          <RotateCcw size={14} strokeWidth={1.75} />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  )
}
