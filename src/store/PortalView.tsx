import { createContext, useContext, useState, type ReactNode } from 'react'

/** Ako sa zobrazuje klientsky portál v deme: v mobilnom ráme alebo ako bežná webová stránka */
export type PortalView = 'mobile' | 'web'

const KEY = 'cisielka-portal-view'

const Ctx = createContext<{ view: PortalView; setView: (v: PortalView) => void }>({ view: 'mobile', setView: () => {} })

export function PortalViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<PortalView>(() => {
    try {
      return localStorage.getItem(KEY) === 'web' ? 'web' : 'mobile'
    } catch {
      return 'mobile'
    }
  })
  const setView = (v: PortalView) => {
    setViewState(v)
    try {
      localStorage.setItem(KEY, v)
    } catch {
      /* ignore */
    }
  }
  return <Ctx.Provider value={{ view, setView }}>{children}</Ctx.Provider>
}

export const usePortalView = () => useContext(Ctx)
