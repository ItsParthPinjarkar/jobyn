/**
 * savedProjects.ts - persist AI-generated capstone projects in localStorage
 * so students can revisit, track status, and export them later.
 */

import type { VerificationResult } from '../api/client'

const LS_KEY = 'cse_saved_projects'

export type ProjectStatus = 'saved' | 'in-progress' | 'verified' | 'partial' | 'insufficient'

export interface SavedProject {
    id: string
    role: string
    skills: string[]
    markdown: string
    status: ProjectStatus
    savedAt: string        // ISO date
    githubUrl?: string
    verification?: VerificationResult
    verifiedAt?: string    // ISO date
}

function _read(userEmail?: string): SavedProject[] {
    const prefix = userEmail ? `${userEmail}_` : ''
    try {
        return JSON.parse(localStorage.getItem(prefix + LS_KEY) || '[]')
    } catch {
        return []
    }
}

function _write(projects: SavedProject[], userEmail?: string) {
    const prefix = userEmail ? `${userEmail}_` : ''
    localStorage.setItem(prefix + LS_KEY, JSON.stringify(projects))
}

export function getSavedProjects(userEmail?: string): SavedProject[] {
    return _read(userEmail).sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    )
}

export function saveProject(
    role: string,
    skills: string[],
    markdown: string,
    userEmail?: string
): SavedProject {
    const projects = _read(userEmail)

    // Deduplicate by role + sorted skills
    const key = `${role}|${skills.slice().sort().join(',')}`
    const existing = projects.find(
        p => `${p.role}|${p.skills.slice().sort().join(',')}` === key
    )
    if (existing) {
        // Update markdown but keep status
        existing.markdown = markdown
        existing.savedAt = new Date().toISOString()
        _write(projects, userEmail)
        return existing
    }

    const project: SavedProject = {
        id: crypto.randomUUID(),
        role,
        skills,
        markdown,
        status: 'saved',
        savedAt: new Date().toISOString(),
    }
    projects.push(project)
    _write(projects, userEmail)
    return project
}

export function updateProjectStatus(
    id: string,
    status: ProjectStatus,
    userEmail?: string
): void {
    const projects = _read(userEmail)
    const p = projects.find(p => p.id === id)
    if (p) {
        p.status = status
        _write(projects, userEmail)
    }
}

export function saveVerification(
    id: string,
    githubUrl: string,
    verification: VerificationResult,
    userEmail?: string,
): void {
    const projects = _read(userEmail)
    const p = projects.find(p => p.id === id)
    if (p) {
        p.githubUrl = githubUrl
        p.verification = verification
        p.verifiedAt = new Date().toISOString()

        // Auto-set status based on verdict
        const verdict = verification.verdict
        if (verdict === 'VERIFIED') p.status = 'verified'
        else if (verdict === 'PARTIAL') p.status = 'partial'
        else p.status = 'insufficient'

        _write(projects, userEmail)
    }
}

export function deleteProject(id: string, userEmail?: string): void {
    const projects = _read(userEmail).filter(p => p.id !== id)
    _write(projects, userEmail)
}

export function isProjectSaved(
    role: string,
    skills: string[],
    userEmail?: string
): boolean {
    const key = `${role}|${skills.slice().sort().join(',')}`
    return _read(userEmail).some(
        p => `${p.role}|${p.skills.slice().sort().join(',')}` === key
    )
}
