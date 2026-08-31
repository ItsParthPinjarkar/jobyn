// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { storageKey, getItem, setItem, removeItem, clearUserData } from '../utils/storage'

const TEST_USER = 'test_storage_user@example.com'

afterEach(() => {
    // Clean up all cse_ keys
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.includes('cse_') || k?.includes(TEST_USER)) keysToRemove.push(k!)
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
})

describe('storageKey', () => {
    it('adds cse_ prefix to bare keys', () => {
        expect(storageKey('test')).toBe('cse_test')
    })

    it('does not double-prefix keys already starting with cse_', () => {
        expect(storageKey('cse_test')).toBe('cse_test')
    })

    it('prepends userEmail when provided', () => {
        expect(storageKey('test', 'user@mail.com')).toBe('user@mail.com_cse_test')
    })

    it('prepends userEmail and does not double-prefix', () => {
        expect(storageKey('cse_test', 'user@mail.com')).toBe('user@mail.com_cse_test')
    })
})

describe('getItem / setItem / removeItem', () => {
    it('round-trips a string value', () => {
        setItem('greeting', 'hello')
        expect(getItem('greeting')).toBe('hello')
    })

    it('round-trips an object value', () => {
        const obj = { name: 'Alice', score: 95 }
        setItem('profile', obj)
        expect(getItem('profile')).toEqual(obj)
    })

    it('round-trips an array value', () => {
        const arr = [1, 2, 3]
        setItem('scores', arr)
        expect(getItem('scores')).toEqual(arr)
    })

    it('returns null for missing key', () => {
        expect(getItem('nonexistent_key_xyz')).toBeNull()
    })

    it('removes item correctly', () => {
        setItem('temp', 'value')
        expect(getItem('temp')).toBe('value')
        removeItem('temp')
        expect(getItem('temp')).toBeNull()
    })

    it('scopes items by userEmail', () => {
        setItem('score', 100, 'alice@test.com')
        setItem('score', 200, 'bob@test.com')
        expect(getItem('score', 'alice@test.com')).toBe(100)
        expect(getItem('score', 'bob@test.com')).toBe(200)
    })
})

describe('clearUserData', () => {
    it('removes only the specified user keys', () => {
        const otherUser = 'other_user@example.com'

        // Set data for test user
        setItem('score', 100, TEST_USER)
        setItem('name', 'Test', TEST_USER)

        // Set data for other user
        setItem('score', 200, otherUser)
        setItem('name', 'Other', otherUser)

        // Clear test user
        clearUserData(TEST_USER)

        // Test user data should be gone
        expect(getItem('score', TEST_USER)).toBeNull()
        expect(getItem('name', TEST_USER)).toBeNull()

        // Other user data should remain
        expect(getItem('score', otherUser)).toBe(200)
        expect(getItem('name', otherUser)).toBe('Other')

        // Cleanup
        clearUserData(otherUser)
    })

    it('handles clearing a user with no data gracefully', () => {
        // Should not throw
        clearUserData('no_data_user@example.com')
    })
})
