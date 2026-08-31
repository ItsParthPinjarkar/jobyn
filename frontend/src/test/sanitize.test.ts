// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
    sanitizeText,
    sanitizeMarkdown,
    isValidEmail,
    isValidPassword,
    isValidName,
    isValidSkill,
    isValidResumeText,
} from '../utils/sanitize'

describe('sanitizeText', () => {
    it('strips script tags', () => {
        const result = sanitizeText("<script>alert('xss')</script>")
        expect(result).not.toContain('<script>')
        expect(result).not.toContain('alert')
    })

    it('strips all HTML tags', () => {
        expect(sanitizeText('<b>hello</b>')).toBe('hello')
        expect(sanitizeText('<div><span>text</span></div>')).toBe('text')
    })

    it('passes through plain text unchanged', () => {
        expect(sanitizeText('hello world')).toBe('hello world')
        expect(sanitizeText('no tags here')).toBe('no tags here')
    })

    it('strips event handlers', () => {
        const result = sanitizeText('<img onerror="alert(1)">')
        expect(result).not.toContain('onerror')
        expect(result).not.toContain('alert')
    })
})

describe('sanitizeMarkdown', () => {
    it('strips script tags', () => {
        const result = sanitizeMarkdown("<script>alert('xss')</script>")
        expect(result).not.toContain('<script>')
    })

    it('preserves allowed tags', () => {
        expect(sanitizeMarkdown('<b>bold</b>')).toContain('<b>bold</b>')
        expect(sanitizeMarkdown('<i>italic</i>')).toContain('<i>italic</i>')
        expect(sanitizeMarkdown('<strong>strong</strong>')).toContain('<strong>strong</strong>')
    })

    it('strips disallowed tags like img', () => {
        const result = sanitizeMarkdown('<img onerror="alert(1)">')
        expect(result).not.toContain('<img')
        expect(result).not.toContain('onerror')
    })

    it('allows links with href', () => {
        const result = sanitizeMarkdown('<a href="https://example.com">link</a>')
        expect(result).toContain('href')
        expect(result).toContain('link')
    })
})

describe('isValidEmail', () => {
    it('accepts valid emails', () => {
        expect(isValidEmail('test@example.com')).toBe(true)
        expect(isValidEmail('user.name@domain.co')).toBe(true)
        expect(isValidEmail('a@b.c')).toBe(true)
    })

    it('rejects invalid emails', () => {
        expect(isValidEmail('invalid')).toBe(false)
        expect(isValidEmail('@no-user.com')).toBe(false)
        expect(isValidEmail('test@')).toBe(false)
        expect(isValidEmail('')).toBe(false)
        expect(isValidEmail('test @example.com')).toBe(false)
    })
})

describe('isValidPassword', () => {
    it('rejects passwords shorter than 6 chars', () => {
        const result = isValidPassword('abc')
        expect(result.valid).toBe(false)
        expect(result.message).toContain('6 characters')
    })

    it('accepts passwords with 6+ chars', () => {
        expect(isValidPassword('123456').valid).toBe(true)
        expect(isValidPassword('strongpassword').valid).toBe(true)
    })

    it('rejects passwords longer than 128 chars', () => {
        const result = isValidPassword('a'.repeat(129))
        expect(result.valid).toBe(false)
        expect(result.message).toContain('too long')
    })

    it('accepts exactly 128 char password', () => {
        expect(isValidPassword('a'.repeat(128)).valid).toBe(true)
    })
})

describe('isValidName', () => {
    it('accepts valid names', () => {
        expect(isValidName('John').valid).toBe(true)
        expect(isValidName('Alice Bob').valid).toBe(true)
    })

    it('rejects empty names', () => {
        expect(isValidName('').valid).toBe(false)
        expect(isValidName('   ').valid).toBe(false)
    })

    it('rejects names with script injection', () => {
        expect(isValidName('<script>alert(1)</script>').valid).toBe(false)
        expect(isValidName('javascript:void(0)').valid).toBe(false)
        expect(isValidName('onclick=alert(1)').valid).toBe(false)
    })

    it('rejects names longer than 100 chars', () => {
        expect(isValidName('a'.repeat(101)).valid).toBe(false)
    })

    it('accepts name at exactly 100 chars', () => {
        expect(isValidName('a'.repeat(100)).valid).toBe(true)
    })
})

describe('isValidSkill', () => {
    it('accepts valid skills', () => {
        expect(isValidSkill('python')).toBe(true)
        expect(isValidSkill('react')).toBe(true)
        expect(isValidSkill('c++')).toBe(true)
    })

    it('rejects empty skills', () => {
        expect(isValidSkill('')).toBe(false)
        expect(isValidSkill('   ')).toBe(false)
    })

    it('rejects skills with script injection', () => {
        expect(isValidSkill('<script>x</script>')).toBe(false)
        expect(isValidSkill('javascript:alert(1)')).toBe(false)
    })

    it('rejects skills longer than 50 chars', () => {
        expect(isValidSkill('a'.repeat(51))).toBe(false)
    })

    it('accepts skill at exactly 50 chars', () => {
        expect(isValidSkill('a'.repeat(50))).toBe(true)
    })
})

describe('isValidResumeText', () => {
    it('rejects text shorter than 50 chars', () => {
        const result = isValidResumeText('short')
        expect(result.valid).toBe(false)
        expect(result.message).toContain('too short')
    })

    it('accepts text with 50+ chars', () => {
        expect(isValidResumeText('a'.repeat(50)).valid).toBe(true)
        expect(isValidResumeText('a'.repeat(100)).valid).toBe(true)
    })

    it('rejects text longer than 500K chars', () => {
        const result = isValidResumeText('a'.repeat(500_001))
        expect(result.valid).toBe(false)
        expect(result.message).toContain('500KB')
    })

    it('accepts text at exactly 500K chars', () => {
        expect(isValidResumeText('a'.repeat(500_000)).valid).toBe(true)
    })
})
