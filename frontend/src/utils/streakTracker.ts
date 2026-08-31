/**
 * streakTracker.ts - Gamification: Daily streaks + XP system.
 *
 * Stored per-user in localStorage. Tracks:
 *  - Daily login/activity streak
 *  - Total XP earned
 *  - XP history (last 30 entries)
 *  - Streak multiplier (1x → 1.5x → 2x → 3x)
 *
 * XP Awards:
 *  - study_opened:     10 XP  (opened study hub)
 *  - quiz_passed:      50 XP  (passed knowledge check)
 *  - quiz_perfect:     100 XP (perfect score)
 *  - project_saved:    20 XP  (saved a project)
 *  - project_verified: 200 XP (AI-verified project)
 *  - daily_login:      5 XP   (first activity of the day)
 */

export type XPAction =
    | 'study_opened'
    | 'quiz_passed'
    | 'quiz_perfect'
    | 'project_saved'
    | 'project_verified'
    | 'daily_login'

const XP_VALUES: Record<XPAction, number> = {
    study_opened: 10,
    quiz_passed: 50,
    quiz_perfect: 100,
    project_saved: 20,
    project_verified: 200,
    daily_login: 5,
}

export interface XPEntry {
    action: XPAction
    xp: number
    timestamp: string
    detail?: string
}

export interface StreakData {
    currentStreak: number
    longestStreak: number
    lastActiveDate: string // YYYY-MM-DD
    totalXP: number
    level: number
    xpHistory: XPEntry[]
    dailyActionsToday: XPAction[] // prevent duplicate awards per day
}

const LS_KEY = 'cse_streak'
const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200, 2000, 3500, 5500, 8000, 12000]

function getKey(userEmail?: string): string {
    return userEmail ? `${userEmail}_${LS_KEY}` : LS_KEY
}

function todayStr(): string {
    return new Date().toISOString().slice(0, 10)
}

function calcLevel(xp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) return i + 1
    }
    return 1
}

export function getStreakMultiplier(streak: number): number {
    if (streak >= 14) return 3.0
    if (streak >= 7) return 2.0
    if (streak >= 3) return 1.5
    return 1.0
}

export function getStreakData(userEmail?: string): StreakData {
    const key = getKey(userEmail)
    try {
        const raw = localStorage.getItem(key)
        if (raw) {
            const data = JSON.parse(raw) as StreakData
            // Check if streak is still alive (no gap > 1 day)
            const today = todayStr()
            const last = data.lastActiveDate
            if (last && last !== today) {
                const lastDate = new Date(last + 'T00:00:00')
                const todayDate = new Date(today + 'T00:00:00')
                const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000)
                if (diffDays > 1) {
                    // Streak broken
                    data.currentStreak = 0
                    data.dailyActionsToday = []
                } else if (diffDays === 1) {
                    // New day - reset daily actions
                    data.dailyActionsToday = []
                }
            }
            data.level = calcLevel(data.totalXP)
            return data
        }
    } catch { /* ignore */ }
    return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: '',
        totalXP: 0,
        level: 1,
        xpHistory: [],
        dailyActionsToday: [],
    }
}

export function awardXP(
    action: XPAction,
    userEmail?: string,
    detail?: string
): { xpAwarded: number; newTotal: number; streakData: StreakData } {
    const data = getStreakData(userEmail)
    const today = todayStr()

    // Prevent duplicate awards for the same action+detail combo today
    const actionKey = detail ? `${action}:${detail}` : action
    if (data.dailyActionsToday.includes(actionKey as XPAction)) {
        return { xpAwarded: 0, newTotal: data.totalXP, streakData: data }
    }

    // Update streak
    if (data.lastActiveDate !== today) {
        const last = data.lastActiveDate
        if (last) {
            const lastDate = new Date(last + 'T00:00:00')
            const todayDate = new Date(today + 'T00:00:00')
            const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000)
            if (diffDays === 1) {
                data.currentStreak += 1
            } else {
                data.currentStreak = 1
            }
        } else {
            data.currentStreak = 1
        }
        data.lastActiveDate = today
        data.dailyActionsToday = []
    }

    if (data.currentStreak > data.longestStreak) {
        data.longestStreak = data.currentStreak
    }

    // Calculate XP with streak multiplier
    const baseXP = XP_VALUES[action]
    const multiplier = getStreakMultiplier(data.currentStreak)
    const xpAwarded = Math.round(baseXP * multiplier)

    data.totalXP += xpAwarded
    data.level = calcLevel(data.totalXP)
    data.dailyActionsToday.push(actionKey as XPAction)

    // Add to history (keep last 50)
    data.xpHistory.push({
        action,
        xp: xpAwarded,
        timestamp: new Date().toISOString(),
        detail,
    })
    if (data.xpHistory.length > 50) {
        data.xpHistory = data.xpHistory.slice(-50)
    }

    // Persist
    const key = getKey(userEmail)
    localStorage.setItem(key, JSON.stringify(data))

    return { xpAwarded, newTotal: data.totalXP, streakData: data }
}

export function getXPForNextLevel(currentXP: number): { current: number; next: number; progress: number } {
    const level = calcLevel(currentXP)
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0
    const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 5000
    const progress = nextThreshold > currentThreshold
        ? Math.round(((currentXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
        : 100
    return { current: currentThreshold, next: nextThreshold, progress }
}

export function getLevelTitle(level: number): string {
    const titles: Record<number, string> = {
        1: 'Beginner',
        2: 'Learner',
        3: 'Explorer',
        4: 'Practitioner',
        5: 'Builder',
        6: 'Specialist',
        7: 'Expert',
        8: 'Master',
        9: 'Architect',
        10: 'Legend',
        11: 'Grandmaster',
    }
    return titles[level] ?? 'Grandmaster'
}
