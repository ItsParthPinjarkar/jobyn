/**
 * sanitize.ts - input validation & XSS sanitization utilities.
 *
 * Uses DOMPurify to strip malicious HTML/JS from user-supplied text.
 * Provides validation helpers for common inputs (email, resume text, skills).
 */

import DOMPurify from 'dompurify'

/* ── Sanitize HTML/text ─────────────────────────────────────── */

/** Strip all HTML tags and scripts from a string */
export function sanitizeText(dirty: string): string {
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/** Allow basic Markdown-safe tags but strip scripts */
export function sanitizeMarkdown(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'blockquote'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
    })
}

/* ── Validation helpers ─────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
    return EMAIL_RE.test(email.trim())
}

export function isValidPassword(password: string): { valid: boolean; message: string } {
    if (password.length < 6) return { valid: false, message: 'Password must be at least 6 characters.' }
    if (password.length > 128) return { valid: false, message: 'Password is too long (max 128 characters).' }
    return { valid: true, message: '' }
}

export function isValidName(name: string): { valid: boolean; message: string } {
    const trimmed = name.trim()
    if (trimmed.length < 1) return { valid: false, message: 'Name is required.' }
    if (trimmed.length > 100) return { valid: false, message: 'Name is too long (max 100 characters).' }
    if (/<script|javascript:|on\w+=/i.test(trimmed)) return { valid: false, message: 'Name contains invalid characters.' }
    return { valid: true, message: '' }
}

/** Validate a skill string (e.g., from user input in skill gap forms) */
export function isValidSkill(skill: string): boolean {
    const trimmed = skill.trim()
    return trimmed.length > 0 && trimmed.length <= 50 && !/<script|javascript:|on\w+=/i.test(trimmed)
}

/** Validate resume text length (sanity check before sending to backend) */
export function isValidResumeText(text: string): { valid: boolean; message: string } {
    if (text.length < 50) return { valid: false, message: 'Resume text is too short - is the file empty?' }
    if (text.length > 500_000) return { valid: false, message: 'Resume text exceeds 500KB. Please use a shorter document.' }
    return { valid: true, message: '' }
}
