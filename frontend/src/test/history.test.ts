// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { loadHistory, saveScore, getHistoryOrDemo } from '../utils/history'

describe('history utility', () => {
    const testEmail = '__test_history_user@test.com'

    it('loadHistory returns empty array for new user', () => {
        expect(loadHistory(testEmail)).toEqual([])
    })

    it('saveScore creates history entry', () => {
        saveScore(75, 'Software Developer', testEmail)
        const hist = loadHistory(testEmail)
        expect(hist.length).toBe(1)
        expect(hist[0].value).toBe(75)
        expect(hist[0].role).toBe('Software Developer')
        // cleanup
        localStorage.removeItem(`${testEmail}_cse_score_history`)
    })

    it('getHistoryOrDemo returns empty array for empty history', () => {
        const result = getHistoryOrDemo([])
        expect(result).toEqual([])
    })

    it('getHistoryOrDemo returns real data when >= 2 entries', () => {
        const real = [
            { label: 'Mar 1', value: 50, role: 'Dev' },
            { label: 'Mar 2', value: 60, role: 'Dev' },
        ]
        expect(getHistoryOrDemo(real)).toEqual(real)
    })
})
