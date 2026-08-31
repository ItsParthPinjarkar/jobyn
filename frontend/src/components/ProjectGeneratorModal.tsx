import { useState, useEffect, useRef } from 'react'
import { generateProject, type ProjectResult } from '../api/client'
import { X, Blocks, AlertTriangle, Copy, Check, Download, Bookmark, BookmarkCheck } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DOMPurify from 'dompurify'
import { saveProject, isProjectSaved } from '../utils/savedProjects'
import { useAuth } from '../context/AuthContext'

interface Props {
    role: string
    skills: string[]
    onClose: () => void
}

export default function ProjectGeneratorModal({ role, skills, onClose }: Props) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [project, setProject] = useState<ProjectResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [saved, setSaved] = useState(() => isProjectSaved(role, skills, user?.email))
    const hasFetched = useRef(false)

    // Stabilise skills into a string so the effect only fires once per unique combo
    const skillsKey = skills.slice().sort().join(',')

    useEffect(() => {
        if (hasFetched.current) return
        hasFetched.current = true

        setLoading(true)
        generateProject(role, skills)
            .then((res: ProjectResult) => setProject(res))
            .catch((err: Error) => setError(err.message || "Failed to generate project"))
            .finally(() => setLoading(false))
    }, [role, skillsKey, skills])

    const handleCopy = () => {
        if (!project) return
        navigator.clipboard.writeText(project.markdown).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    const handleDownload = () => {
        if (!project) return
        const blob = new Blob([project.markdown], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${role.replace(/\s+/g, '-').toLowerCase()}-capstone-project.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleSave = () => {
        if (!project) return
        saveProject(role, skills, project.markdown, user?.email)
        setSaved(true)
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 20
        }}>
            <div className="card" onClick={e => e.stopPropagation()} style={{
                width: '100%', maxWidth: 800, maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', padding: 0,
                overflow: 'hidden', background: 'var(--bg-card)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)', borderRadius: 16
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(59, 130, 246, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'var(--blue)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Blocks size={24} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>AI Capstone Project Generator</h2>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                Building skills: <strong style={{ color: 'var(--text-primary)' }}>{skills.join(', ')}</strong>
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="btn-icon" style={{ padding: 8, background: 'var(--bg-border)', borderRadius: '50%', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ overflowY: 'auto', padding: '32px', flex: 1 }}>
                    {loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 16 }}>
                            <div className="spinner spinner--lg" />
                            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Drafting the perfect project based on {skills.join(', ')}...</div>
                        </div>
                    )}

                    {error && !loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', borderRadius: 8 }}>
                            <AlertTriangle size={24} />
                            <div>{error}</div>
                        </div>
                    )}

                    {project && !loading && (
                        <div className="markdown-body" style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: 15 }}>
                            {project.is_fallback && (
                                <div style={{ fontSize: 12, color: 'var(--orange)', marginBottom: 24, padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 6, display: 'inline-block' }}>
                                    ⚠️ Generated using fallback template. For custom AI generation, please configure GOOGLE_API_KEY.
                                </div>
                            )}
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {DOMPurify.sanitize(project.markdown)}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button"
                            onClick={handleCopy}
                            className="btn btn--outline"
                            disabled={!project || loading}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            {copied ? <Check size={15} color="var(--green)" /> : <Copy size={15} />}
                            {copied ? 'Copied!' : 'Copy Markdown'}
                        </button>
                        <button type="button"
                            onClick={handleDownload}
                            className="btn btn--outline"
                            disabled={!project || loading}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <Download size={15} /> Download .md
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" onClick={onClose} className="btn btn--outline">Close</button>
                        <button type="button"
                            className="btn btn--primary"
                            disabled={!project || loading || saved}
                            onClick={handleSave}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                            {saved ? 'Saved to My Projects' : 'Save to My Projects'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Markdown styling overrides within this modal */}
            <style>{`
                .markdown-body h1 { font-size: 28px; font-weight: 800; margin-bottom: 24px; color: var(--blue); }
                .markdown-body h2 { font-size: 20px; font-weight: 700; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;}
                .markdown-body ul, .markdown-body ol { margin-bottom: 16px; padding-left: 24px; }
                .markdown-body li { margin-bottom: 8px; }
                .markdown-body code { background: var(--bg-input); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; border: 1px solid var(--border);}
                .markdown-body pre { background: var(--bg-input); padding: 16px; border-radius: 8px; overflow-x: auto; border: 1px solid var(--border); margin-bottom: 16px;}
                .markdown-body pre code { background: none; border: none; padding: 0; }
                .markdown-body p { margin-bottom: 16px; }
            `}</style>
        </div>
    )
}
