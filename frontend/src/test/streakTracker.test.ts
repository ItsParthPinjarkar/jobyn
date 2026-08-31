// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
    getStreakMultiplier,
    getLevelTitle,
    getXPForNextLevel,
    awardXP,
    getStreakData,
} from '../utils/streakTracker'

const TEST_EMAIL = '__test_streak@test.com'
const LS_KEY = `${TEST_EMAIL}_cse_streak`

afterEach(() => {
    localStorage.removeItem(LS_KEY)
})

describe('getStreakMultiplier', () => {
    it('returns 1.0 for streak < 3', () => {
        expect(getStreakMultiplier(0)).toBe(1.0)
        expect(getStreakMultiplier(1)).toBe(1.0)
        expect(getStreakMultiplier(2)).toBe(1.0)
    })

    it('returns 1.5 for streak 3-6', () => {
        expect(getStreakMultiplier(3)).toBe(1.5)
        expect(getStreakMultiplier(5)).toBe(1.5)
        expect(getStreakMultiplier(6)).toBe(1.5)
    })

    it('returns 2.0 for streak 7-13', () => {
        expect(getStreakMultiplier(7)).toBe(2.0)
        expect(getStreakMultiplier(10)).toBe(2.0)
        expect(getStreakMultiplier(13)).toBe(2.0)
    })

    it('returns 3.0 for streak >= 14', () => {
        expect(getStreakMultiplier(14)).toBe(3.0)
        expect(getStreakMultiplier(30)).toBe(3.0)
        expect(getStreakMultiplier(100)).toBe(3.0)
    })
})

describe('getLevelTitle', () => {
    it('returns correct titles for each level', () => {
        expect(getLevelTitle(1)).toBe('Beginner')
        expect(getLevelTitle(2)).toBe('Learner')
        expect(getLevelTitle(3)).toBe('Explorer')
        expect(getLevelTitle(4)).toBe('Practitioner')
        expect(getLevelTitle(5)).toBe('Builder')
        expect(getLevelTitle(6)).toBe('Specialist')
        expect(getLevelTitle(7)).toBe('Expert')
        expect(getLevelTitle(8)).toBe('Master')
        expect(getLevelTitle(9)).toBe('Architect')
        expect(getLevelTitle(10)).toBe('Legend')
        expect(getLevelTitle(11)).toBe('Grandmaster')
    })

    it('returns Grandmaster for unknown high levels', () => {
        expect(getLevelTitle(99)).toBe('Grandmaster')
        expect(getLevelTitle(0)).toBe('Grandmaster')
    })
})

describe('getXPForNextLevel', () => {
    // LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200, 2000, 3500, 5500, 8000, 12000]

    it('returns correct values at 0 XP (level 1)', () => {
        const result = getXPForNextLevel(0)
        expect(result.current).toBe(0)
        expect(result.next).toBe(50)
        expect(result.progress).toBe(0)
    })

    it('returns correct values at 50 XP (level 2)', () => {
        const result = getXPForNextLevel(50)
        expect(result.current).toBe(50)
        expect(result.next).toBe(150)
        expect(result.progress).toBe(0)
    })

    it('returns correct progress at 100 XP (between level 2 and 3)', () => {
        const result = getXPForNextLevel(100)
        expect(result.current).toBe(50)
        expect(result.next).toBe(150)
        // progress = (100-50)/(150-50) * 100 = 50
        expect(result.progress).toBe(50)
    })
})

describe('awardXP', () => {
    it('awards correct base XP for study_opened (10 XP, 1x multiplier)', () => {
        const result = awardXP('study_opened', TEST_EMAIL)
        expect(result.xpAwarded).toBe(10)
        expect(result.newTotal).toBe(10)
        expect(result.streakData.totalXP).toBe(10)
    })

    it('prevents duplicate awards on the same day', () => {
        awardXP('study_opened', TEST_EMAIL)
        const result = awardXP('study_opened', TEST_EMAIL)
        expect(result.xpAwarded).toBe(0)
        expect(result.newTotal).toBe(10)
    })

    it('allows different actions on the same day', () => {
        awardXP('study_opened', TEST_EMAIL)
        const result = awardXP('daily_login', TEST_EMAIL)
        expect(result.xpAwarded).toBe(5)
        expect(result.newTotal).toBe(15)
    })

    it('updates streak on first activity', () => {
        const result = awardXP('daily_login', TEST_EMAIL)
        expect(result.streakData.currentStreak).toBe(1)
        expect(result.streakData.lastActiveDate).toBeTruthy()
    })

    it('calculates level correctly from XP', () => {
        // awardXP 'quiz_perfect' = 100 XP with 1x multiplier
        const result = awardXP('quiz_perfect', TEST_EMAIL)
        // LEVEL_THRESHOLDS = [0, 50, 150, ...], calcLevel checks from end
        // 100 >= 50 → i=1 → return 2
        expect(result.streakData.level).toBe(2)
    })
})

describe('getStreakData', () => {
    it('returns default data for new user', () => {
        const data = getStreakData('__nonexistent_user@test.com')
        expect(data.currentStreak).toBe(0)
        expect(data.longestStreak).toBe(0)
        expect(data.totalXP).toBe(0)
        expect(data.level).toBe(1)
        expect(data.xpHistory).toEqual([])
        expect(data.dailyActionsToday).toEqual([])
    })

    it('returns persisted data after awardXP', () => {
        awardXP('study_opened', TEST_EMAIL)
        const data = getStreakData(TEST_EMAIL)
        expect(data.totalXP).toBe(10)
        expect(data.currentStreak).toBe(1)
        expect(data.xpHistory.length).toBe(1)
    })
})
