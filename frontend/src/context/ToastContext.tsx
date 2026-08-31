import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: number
    message: string
    type: ToastType
    exiting?: boolean
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export const useToast = () => useContext(ToastContext)

const ICONS: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const idRef = useRef(0)

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++idRef.current
        setToasts(prev => [...prev, { id, message, type }])

        // Start exit animation after 2.5s, then remove after animation ends
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300)
        }, 2500)
    }, [])

    const value = useMemo(() => ({ toast }), [toast])

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toasts.length > 0 && (
                <div className="toast-container" role="status" aria-live="polite">
                    {toasts.map(t => (
                        <div
                            key={t.id}
                            className={`toast toast--${t.type}${t.exiting ? ' toast--exit' : ''}`}
                        >
                            <span className="toast__icon">{ICONS[t.type]}</span>
                            {t.message}
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    )
}
