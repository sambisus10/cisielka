import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, Info } from 'lucide-react'

interface ToastItem {
  id: number
  text: string
  tone: 'success' | 'info'
}

const Ctx = createContext<(text: string, tone?: ToastItem['tone']) => void>(() => {})

let n = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((text: string, tone: ToastItem['tone'] = 'success') => {
    const id = ++n
    setItems((xs) => [...xs, { id, text, tone }].slice(-2))
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-12 z-[60] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center gap-2 sm:bottom-4 sm:top-auto">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-2 rounded-md bg-zinc-900 px-3.5 py-2 text-sm text-white shadow-lg">
            {t.tone === 'success' ? (
              <CheckCircle2 size={16} strokeWidth={1.75} className="text-emerald-400" />
            ) : (
              <Info size={16} strokeWidth={1.75} className="text-zinc-400" />
            )}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
