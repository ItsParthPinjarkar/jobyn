/**
 * storage.ts - shared localStorage utility with consistent prefix.
 *
 * All keys are prefixed with `cse_` to avoid collisions.
 * User-scoped keys additionally get the user email prefix.
 */

const APP_PREFIX = 'cse_'

export function storageKey(key: string, userEmail?: string): string {
    const base = key.startsWith(APP_PREFIX) ? key : `${APP_PREFIX}${key}`
    return userEmail ? `${userEmail}_${base}` : base
}

export function getItem<T>(key: string, userEmail?: string): T | null {
    try {
        const raw = localStorage.getItem(storageKey(key, userEmail))
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function setItem(key: string, value: unknown, userEmail?: string): void {
    localStorage.setItem(storageKey(key, userEmail), JSON.stringify(value))
}

export function removeItem(key: string, userEmail?: string): void {
    localStorage.removeItem(storageKey(key, userEmail))
}

/** Remove all cse_ keys for a given user */
export function clearUserData(userEmail: string): void {
    const prefix = `${userEmail}_${APP_PREFIX}`
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith(prefix)) keysToRemove.push(k)
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
}
