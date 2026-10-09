import { NavLink, Outlet } from 'react-router-dom'
import { Inbox, FolderCheck, Mail } from 'lucide-react'
import { useStore } from '../store/AppStore'
import { cn } from './ui'

/**
 * Klientsky portál – navrhnutý pre mobil. Na desktope sa zobrazí vycentrovaný v úzkom ráme,
 * aby bolo pri prezentácii jasné, že ide o mobilný zážitok klienta.
 */
export function ClientLayout() {
  const { state } = useStore()
  const client = state.clients.find((c) => c.id === state.portalClientId)
  const unread = state.clientMessages.filter((m) => m.clientId === state.portalClientId && !m.read).length
  const open = state.requests.filter((r) => r.clientId === state.portalClientId && r.status === 'waiting_client').length

  const tabs = [
    { to: '/portal', label: 'Požiadavky', icon: Inbox, end: true, count: open },
    { to: '/portal/uploads', label: 'Odovzdané', icon: FolderCheck },
    { to: '/portal/messages', label: 'Správy', icon: Mail, count: unread },
  ]

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
                {!!t.count && (
                  <span className="num absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-semibold text-white">
                    {t.count}
                  </span>
                )}
              </span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
