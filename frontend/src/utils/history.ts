/** Persists score history in localStorage so Dashboard can show real trend */

const LS_KEY = 'cse_score_history'
const MAX_ENTRIES = 12

export interface HistoryEntry {
    label: string   // e.g. "Mar 1"
    value: number   // final_score
    role: string
}

export function saveScore(score: number, role: string, userEmail?: string): void {
    const prefix = userEmail ? `${userEmail}_` : ''
    const hist = loadHistory(userEmail)
    const now = new Date()
    const label = now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })

    // Avoid duplicate on the same calendar day
    const last = hist[hist.length - 1]
    if (last?.label === label) {
        last.value = score
        last.role = role
    } else {
        hist.push({ label, value: score, role })
        if (hist.length > MAX_ENTRIES) hist.shift()
    }

    localStorage.setItem(prefix + LS_KEY, JSON.stringify(hist))
}

export function loadHistory(userEmail?: string): HistoryEntry[] {
    const prefix = userEmail ? `${userEmail}_` : ''
    try { return JSON.parse(localStorage.getItem(prefix + LS_KEY) || '[]') }
    catch { return [] }
}

/** Returns real history only - no synthetic demo data */
export function getHistoryOrDemo(real: HistoryEntry[]): HistoryEntry[] {
    return real
}
