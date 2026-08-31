import { useState } from 'react'
import {
    Github, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
    ExternalLink, GitCommitHorizontal, FileCode, Code2,
    ChevronRight, Loader2,
} from 'lucide-react'
import { verifyProject, type VerificationResult } from '../api/client'
import type { SavedProject } from '../utils/savedProjects'

interface Props {
    project: SavedProject
    onVerified: (githubUrl: string, result: VerificationResult) => void
}

const VERDICT_META = {
    VERIFIED:     { label: 'Verified',     color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   Icon: ShieldCheck },
    PARTIAL:      { label: 'Partial',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  Icon: ShieldAlert },
    INSUFFICIENT: { label: 'Insufficient', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   Icon: ShieldX },
    SUSPICIOUS:   { label: 'Suspicious',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  Icon: AlertTriangle },
}

const CRITERIA_LABELS: Record<string, string> = {
    skill_coverage:    'Skill Coverage',
    spec_alignment:    'Spec Alignment',
    code_authenticity: 'Code Authenticity',
    documentation:     'Documentation',
    completeness:      'Completeness',
}

function ScoreBar({ score, color }: { score: number; color: string }) {
    return (
        <div style={{ flex: 1, height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
                width: `${score}%`, height: '100%', borderRadius: 4,
                background: color,
                transition: 'width 0.6s ease',
            }} />
        </div>
    )
}

function scoreColor(score: number) {
    if (score >= 75) return '#22c55e'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
}

export default function ProjectVerifier({ project, onVerified }: Props) {
    const [url, setUrl] = useState(project.githubUrl || '')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<VerificationResult | null>(project.verification || null)

    const handleVerify = async () => {
        if (!url.trim()) {
            setError('Please enter a GitHub repository URL')
            return
        }
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const res = await verifyProject(url.trim(), project.markdown, project.skills, project.role)
            setResult(res)
            onVerified(url.trim(), res)
        } catch (e: any) {
            setError(e?.message || e?.detail || 'Verification failed. Check the URL and try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: '20px 24px' }}>
            {/* Input section */}
            {!result && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <Github size={20} color="var(--text-primary)" />
                        <div>
                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Verify with GitHub</h4>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                                Submit your public GitHub repo - we'll analyze commits, code, and structure against the project spec
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            type="text"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://github.com/username/repo"
                            disabled={loading}
                            style={{
                                flex: 1, padding: '10px 14px',
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                borderRadius: 10, color: 'var(--text-primary)', fontSize: 14,
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleVerify()}
                        />
                        <button type="button"
                            className="btn btn--primary"
                            onClick={handleVerify}
                            disabled={loading || !url.trim()}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120, justifyContent: 'center' }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="spin" /> Analyzing…
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={16} /> Verify
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div style={{
                            marginTop: 12, padding: '10px 14px', borderRadius: 8,
                            background: 'rgba(239,68,68,0.1)', color: 'var(--red)',
                            fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}

                    {loading && (
                        <div style={{
                            marginTop: 16, padding: 20, textAlign: 'center',
                            color: 'var(--text-muted)', fontSize: 13,
                        }}>
                            <div style={{ marginBottom: 12 }}>
                                <div className="spinner" />
                            </div>
                            Fetching repo data from GitHub & running AI analysis…
                            <br />
                            <span style={{ fontSize: 12 }}>This may take 10-20 seconds</span>
                        </div>
                    )}
                </div>
            )}

            {/* Result section */}
            {result && (
                <VerificationReport
                    result={result}
                    onReVerify={() => { setResult(null); setError(null) }}
                />
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    )
}


function VerificationReport({ result, onReVerify }: { result: VerificationResult; onReVerify: () => void }) {
    const verdict = VERDICT_META[result.verdict] || VERDICT_META.INSUFFICIENT
    const VIcon = verdict.Icon

    const criteria = [
        'skill_coverage', 'spec_alignment', 'code_authenticity', 'documentation', 'completeness',
    ] as const

    return (
        <div>
            {/* Header card */}
            <div style={{
                padding: '20px', borderRadius: 12, background: verdict.bg,
                border: `1.5px solid ${verdict.color}30`,
                display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
            }}>
                <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: verdict.bg, border: `2px solid ${verdict.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <span style={{ fontSize: 24, fontWeight: 900, color: verdict.color }}>
                        {result.overall_score}
                    </span>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <VIcon size={18} color={verdict.color} />
                        <span style={{ fontSize: 16, fontWeight: 700, color: verdict.color }}>{verdict.label}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {result.summary}
                    </p>
                </div>
            </div>

            {/* Repo quick stats */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 10, marginBottom: 20,
            }}>
                {[
                    { id: 'commits', icon: <GitCommitHorizontal size={14} />, label: 'Commits', value: result.commit_count },
                    { id: 'files', icon: <FileCode size={14} />, label: 'Files', value: result.file_count },
                    { id: 'languages', icon: <Code2 size={14} />, label: 'Languages', value: result.languages?.join(', ') || '-' },
                ].map((s) => (
                    <div key={s.id} style={{
                        padding: '10px 14px', borderRadius: 8,
                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                        fontSize: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', marginBottom: 4 }}>
                            {s.icon} {s.label}
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Criteria breakdown */}
            <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Verification Breakdown</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {criteria.map(key => {
                        const c = (result as any)[key] as { score: number; detail: string } | undefined
                        if (!c) return null
                        const color = scoreColor(c.score)
                        return (
                            <div key={key}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{CRITERIA_LABELS[key]}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color }}>{c.score}/100</span>
                                </div>
                                <ScoreBar score={c.score} color={color} />
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{c.detail}</p>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Strengths & Improvements */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {result.strengths?.length > 0 && (
                    <div style={{ padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                        <h5 style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✓ Strengths</h5>
                        {result.strengths.map((s) => (
                            <div key={s} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', gap: 6 }}>
                                <ChevronRight size={12} style={{ flexShrink: 0, marginTop: 2 }} /> {s}
                            </div>
                        ))}
                    </div>
                )}
                {result.improvements?.length > 0 && (
                    <div style={{ padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <h5 style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--orange)', fontWeight: 700 }}>↑ To Improve</h5>
                        {result.improvements.map((s) => (
                            <div key={s} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', gap: 6 }}>
                                <ChevronRight size={12} style={{ flexShrink: 0, marginTop: 2 }} /> {s}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <a
                    href={result.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        fontSize: 13, color: 'var(--blue)', textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}
                >
                    <ExternalLink size={14} /> View on GitHub
                </a>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn--outline" onClick={onReVerify} style={{ fontSize: 13, padding: '6px 14px' }}>
                        Re-verify
                    </button>
                </div>
            </div>

            {result.is_rule_based && (
                <div style={{
                    marginTop: 12, padding: '8px 12px', borderRadius: 6,
                    background: 'rgba(59,130,246,0.08)', fontSize: 12, color: 'var(--text-muted)',
                }}>
                    ℹ️ AI verification was unavailable - this is a rule-based analysis. Re-verify later for a detailed AI review.
                </div>
            )}
        </div>
    )
}
