import { NavLink, Outlet } from 'react-router-dom'
import { Inbox, FolderCheck, Mail } from 'lucide-react'
import { useStore } from '../store/AppStore'
import { usePortalView } from '../store/PortalView'
import { Avatar, cn } from './ui'

/**
 * Klientsky portál – primárne pre mobil. Na desktope sa v mobilnom režime zobrazí vycentrovaný v úzkom ráme,
 * vo webovom režime ako bežná stránka s navigáciou hore.
 */
export function ClientLayout() {
  const { state } = useStore()
  const { view } = usePortalView()
  const client = state.clients.find((c) => c.id === state.portalClientId)
  const unread = state.clientMessages.filter((m) => m.clientId === state.portalClientId && !m.read).length
  const open = state.requests.filter((r) => r.clientId === state.portalClientId && r.status === 'waiting_client').length

  const tabs = [
    { to: '/portal', label: 'Požiadavky', icon: Inbox, end: true, count: open },
    { to: '/portal/uploads', label: 'Odovzdané', icon: FolderCheck },
    { to: '/portal/messages', label: 'Správy', icon: Mail, count: unread },
  ]

  const countBadge = (n?: number) =>
    !!n && (
      <span className="num flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-semibold text-white">{n}</span>
    )

  if (view === 'web') {
    return (
      <div className="min-h-[calc(100vh-2.5rem)] bg-zinc-50">
        <header className="sticky top-10 z-20 border-b border-zinc-200 bg-white">
          <div className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{state.accountant.office}</p>
              <p className="truncate text-sm font-semibold text-zinc-900">Portál pre klientov</p>
            </div>
            <nav className="flex h-full flex-1 items-stretch gap-1">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cn(
                      '-mb-px flex items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors',
                      isActive ? 'border-accent-600 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800',
                    )
                  }
                >
                  <t.icon size={16} strokeWidth={1.75} className="hidden sm:block" />
                  {t.label}
                  {countBadge(t.count)}
                </NavLink>
              ))}
            </nav>
            <div className="hidden items-center gap-2.5 md:flex">
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-zinc-900">{client?.contactName}</p>
                {client?.legalForm === 'sro' && <p className="text-xs text-zinc-500">{client.name}</p>}
              </div>
              {client && <Avatar name={client.contactName} />}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] justify-center bg-zinc-100 sm:py-8">
      <div className="relative flex w-full max-w-[420px] flex-col bg-zinc-50 sm:min-h-[760px] sm:overflow-hidden sm:rounded-[28px] sm:border sm:border-zinc-300 sm:shadow-xl">
        <header className="sticky top-10 z-20 border-b border-zinc-200 bg-white px-5 pb-3 pt-4 sm:top-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{state.accountant.office}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">{client?.name}</p>
        </header>
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
          <Outlet />
        </main>
        <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[420px] -translate-x-1/2 border-t border-zinc-200 bg-white sm:absolute">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn('relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', isActive ? 'text-accent-700' : 'text-zinc-500')
              }
            >
              <span className="relative">
                <t.icon size={20} strokeWidth={1.75} />
                {!!t.count && <span className="absolute -right-2.5 -top-1.5">{countBadge(t.count)}</span>}
              </span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
