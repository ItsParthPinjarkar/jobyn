import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Session, User as SupaUser } from '@supabase/supabase-js'

export interface User { name: string; email: string; isAdmin: boolean }
interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    signup: (name: string, email: string, password: string) => Promise<void>
    loginWithGoogle: () => Promise<void>
    logout: () => void
}

const Ctx = createContext<AuthState | null>(null)

// Default user when Supabase is not configured
const DEFAULT_USER: User = {
    name: 'Guest',
    email: 'guest@localhost',
    isAdmin: true  // Allow full access in local mode
}

function toAppUser(su: SupaUser | null | undefined): User | null {
    if (!su || !su.email) return null
    const appMeta = su.app_metadata as { role?: string; roles?: string[] } | undefined
    return {
        name: su.user_metadata?.name || su.email.split('@')[0],
        email: su.email,
        isAdmin: appMeta?.role === 'admin' || (Array.isArray(appMeta?.roles) && appMeta.roles.includes('admin')),
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    /* ── Bootstrap: get existing session + subscribe to changes ── */
    useEffect(() => {
        // If Supabase is not configured, use default user immediately
        if (!isSupabaseConfigured) {
            setUser(DEFAULT_USER)
            setLoading(false)
            return
        }

        // 1. Get the current session on mount (with 5s timeout fallback)
        const timeout = setTimeout(() => {
            setLoading(false) // unstick even if Supabase is unreachable
        }, 5000)

        supabase.auth.getSession().then(({ data: { session: s } }) => {
            clearTimeout(timeout)
            setSession(s)
            setUser(toAppUser(s?.user))
            setLoading(false)
        }).catch(() => {
            clearTimeout(timeout)
            // On error, use default user
            setUser(DEFAULT_USER)
            setLoading(false)
        })

        // 2. Listen for future auth events (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, s) => {
                setSession(s)
                setUser(toAppUser(s?.user))
            },
        )

        return () => subscription.unsubscribe()
    }, [])

    /* ── Actions ────────────────────────────────────────────────── */
    const login = useCallback(async (email: string, password: string) => {
        if (!isSupabaseConfigured) {
            setUser(DEFAULT_USER)
            return
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
    }, [])

    const signup = useCallback(async (name: string, email: string, password: string) => {
        if (!isSupabaseConfigured) {
            setUser({ ...DEFAULT_USER, name, email })
            return
        }
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
        })
        if (error) throw new Error(error.message)

        if (data.user && !data.session) {
            throw new Error("VerificationEmailSent")
        }

        if (!data.session) {
            const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
            if (loginErr) throw new Error(loginErr.message)
        }
    }, [])

    const loginWithGoogle = useCallback(async () => {
        if (!isSupabaseConfigured) {
            setUser(DEFAULT_USER)
            return
        }
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/onboarding`,
            },
        })
        if (error) throw new Error(error.message)
    }, [])

    const logout = useCallback(() => {
        if (!isSupabaseConfigured) {
            return
        }
        supabase.auth.signOut()
    }, [])

    const value = useMemo(() => ({
        user,
        session,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout
    }), [user, session, loading, login, signup, loginWithGoogle, logout])

    return (
        <Ctx.Provider value={value}>
            {children}
        </Ctx.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error('useAuth must be inside AuthProvider')
    return ctx
}
