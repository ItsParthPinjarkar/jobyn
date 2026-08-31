/**
 * Onboarding checklist completion tracking.
 *
 * Persists to localStorage with user-email prefix so each user's
 * progress is independent.
 */

const LS_KEY = 'cse_onboarding_checklist'

export interface ChecklistState {
    reviewed_skill_gaps: boolean
    completed_interview: boolean
    started_learning: boolean
    generated_project: boolean
}

const DEFAULT_STATE: ChecklistState = {
    reviewed_skill_gaps: false,
    completed_interview: false,
    started_learning: false,
    generated_project: false,
}

export function getChecklistState(email?: string): ChecklistState {
    const key = email ? `${email}_${LS_KEY}` : LS_KEY
    try {
        const raw = localStorage.getItem(key)
        if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) }
    } catch { /* ignore */ }
    return { ...DEFAULT_STATE }
}

export function markChecklistItem<K extends keyof ChecklistState>(
    item: K,
    email?: string,
): void {
    const key = email ? `${email}_${LS_KEY}` : LS_KEY
    const state = getChecklistState(email)
    state[item] = true
    localStorage.setItem(key, JSON.stringify(state))
}

export function getCompletionCount(state: ChecklistState): number {
    return Object.values(state).filter(Boolean).length
}
