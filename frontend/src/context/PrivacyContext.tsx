import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'

interface PrivacyCtx { privacy: boolean; setPrivacy: (v: boolean) => void }

export const PrivacyContext = createContext<PrivacyCtx>({ privacy: false, setPrivacy: () => {} })

export function usePrivacy() {
    return useContext(PrivacyContext)
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
    const [privacy, setPrivacy] = useState(() => localStorage.getItem('cse_privacy') === 'true')

    useEffect(() => { localStorage.setItem('cse_privacy', String(privacy)) }, [privacy])

    const value = useMemo(() => ({ privacy, setPrivacy }), [privacy])

    return (
        <PrivacyContext.Provider value={value}>
            {children}
        </PrivacyContext.Provider>
    )
}
