import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, FileText, Inbox, LayoutDashboard, Search, Settings, Users } from 'lucide-react'
import { useStore } from '../store/AppStore'
import { Avatar, cn } from './ui'
import { formatDateTime, formatMoney } from '../lib/format'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight text-zinc-900', className)}>
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-600 text-[13px] font-bold text-white">Č</span>
      Čísielka
    </span>
  )
}

export function AccountantLayout() {
  const { state } = useStore()
  const waitingOnMe = state.requests.filter((r) => r.status === 'waiting_accountant').length
  const toReview = state.documents.filter((d) => d.status === 'uploaded').length

  const nav = [
    { to: '/', label: 'Prehľad', icon: LayoutDashboard, end: true },
    { to: '/requests', label: 'Požiadavky', icon: Inbox, count: waitingOnMe },
    { to: '/clients', label: 'Klienti', icon: Users },
    { to: '/documents', label: 'Doklady', icon: FileText, count: toReview },
    { to: '/settings', label: 'Nastavenia', icon: Settings },
  ]

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)]">
      <aside className="sticky top-10 hidden h-[calc(100vh-2.5rem)] w-56 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex h-14 items-center border-b border-zinc-200 px-4">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                )
              }
            >
              <item.icon size={16} strokeWidth={1.75} className="text-zinc-500" />
              <span className="flex-1">{item.label}</span>
              {!!item.count && <span className="num text-xs text-zinc-500">{item.count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 border-t border-zinc-200 p-3">
          <Avatar name={state.accountant.name} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-zinc-900">{state.accountant.name}</p>
            <p className="truncate text-xs text-zinc-500">{state.accountant.office}</p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-10 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <Logo className="md:hidden" />
          <GlobalSearch />
          <div className="ml-auto">
            <NotificationsBell />
          </div>
        </header>
        {/* mobilná navigácia */}
        <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-2 py-1.5 md:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn('whitespace-nowrap rounded-md px-2.5 py-1 text-sm', isActive ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-600')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function GlobalSearch() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (t.length < 2) return null
    const has = (...xs: (string | undefined)[]) => xs.some((x) => x?.toLowerCase().includes(t))
    return {
      clients: state.clients.filter((c) => has(c.name, c.contactName, c.ico, c.email)).slice(0, 4),
      requests: state.requests.filter((r) => has(r.title, r.description)).slice(0, 4),
      documents: state.documents.filter((d) => has(d.fileName, d.data.supplierName, d.data.invoiceNumber, d.data.supplierIco, d.data.description)).slice(0, 5),
    }
  }, [q, state])

  const clientName = (id: string) => state.clients.find((c) => c.id === id)?.name ?? ''
  const go = (to: string) => {
    navigate(to)
    setQ('')
    setOpen(false)
  }
  const empty = results && !results.clients.length && !results.requests.length && !results.documents.length

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Hľadať klienta, dodávateľa, číslo faktúry…"
        className="h-8 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-sm placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/15"
      />
      {open && results && (
        <div className="absolute left-0 right-0 top-10 z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {empty && <p className="px-3 py-4 text-center text-sm text-zinc-500">Nič sa nenašlo</p>}
          {!!results.clients.length && <SearchGroup label="Klienti" />}
          {results.clients.map((c) => (
            <SearchRow key={c.id} onClick={() => go(`/clients/${c.id}`)} title={c.name} meta={`IČO ${c.ico}`} />
          ))}
          {!!results.requests.length && <SearchGroup label="Požiadavky" />}
          {results.requests.map((r) => (
            <SearchRow key={r.id} onClick={() => go(`/requests/${r.id}`)} title={r.title} meta={clientName(r.clientId)} />
          ))}
          {!!results.documents.length && <SearchGroup label="Doklady" />}
          {results.documents.map((d) => (
            <SearchRow
              key={d.id}
              onClick={() => go(`/documents/${d.id}`)}
              title={d.data.supplierName ? `${d.data.supplierName} · ${d.data.invoiceNumber}` : d.fileName}
              meta={`${clientName(d.clientId)}${d.data.total ? ` · ${formatMoney(d.data.total)}` : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SearchGroup({ label }: { label: string }) {
  return <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
}

function SearchRow({ title, meta, onClick }: { title: string; meta: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left hover:bg-zinc-50">
      <span className="truncate text-sm text-zinc-900">{title}</span>
      <span className="shrink-0 truncate text-xs text-zinc-500">{meta}</span>
    </button>
  )
}

function NotificationsBell() {
  const { state, markAccountantNotificationsRead } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = state.accountantNotifications.filter((n) => !n.read).length

  useEffect(() => {
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const items = [...state.accountantNotifications].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          if (!open && unread) setTimeout(markAccountantNotificationsRead, 1500)
        }}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        aria-label="Notifikácie"
      >
        <Bell size={17} strokeWidth={1.75} />
        {!!unread && (
          <span className="num absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-200 px-4 py-2.5 text-sm font-semibold">Notifikácie</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-zinc-500">Žiadne notifikácie</p>}
            {items.map((n) => (
              <Link
                key={n.id}
                to={n.requestId ? `/requests/${n.requestId}` : n.documentId ? `/documents/${n.documentId}` : `/clients/${n.clientId}`}
                onClick={() => setOpen(false)}
                className="flex gap-3 border-b border-zinc-100 px-4 py-2.5 last:border-0 hover:bg-zinc-50"
              >
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent-600')} />
                <span className="min-w-0">
                  <span className="block text-sm text-zinc-800">{n.text}</span>
                  <span className="num block text-xs text-zinc-500">{formatDateTime(n.at)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
