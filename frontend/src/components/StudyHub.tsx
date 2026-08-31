import { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react'
import { X, BookOpen, CheckCircle2, ChevronRight, ChevronLeft, BrainCircuit, Lightbulb, Clock, MessageSquare, Send, Sparkles, Pin, Sun, Moon, Target, Zap, RotateCcw, AlertCircle, Code2, ExternalLink, Loader2 } from 'lucide-react'
import { getStudyNotes, getStudyQuiz, getStudySection, studyChat, saveStudyProgress, getStudyProgress, submitQuizGrade, traceCode, type StudyNotesResult, type QuizResult, type DetailedContent, type SandboxTraceResult } from '../api/client'
const ReactMarkdown = lazy(() => import('react-markdown'))
import remarkGfm from 'remark-gfm'
import { useResume } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'
import InterviewSimulator from './InterviewSimulator'
import CodeBlock from './CodeBlock'
import CodeVisualizer from './CodeVisualizer'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import './StudyHub.css'

interface StudyHubProps {
    skill: string
    onClose: () => void
    onVerified: (skill: string) => void
}

type Tab = 'notes' | 'quiz' | 'ask' | 'interview'

export default function StudyHub({ skill, onClose, onVerified }: StudyHubProps) {
    const { masteredSkills } = useResume()
    const { user } = useAuth()
    const [tab, setTab] = useState<Tab>('notes')
    const [notes, setNotes] = useState<StudyNotesResult | null>(null)
    const [quiz, setQuiz] = useState<QuizResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')

    // Paginated section state
    const [activeSectionIdx, setActiveSectionIdx] = useState(0)
    const [sections, setSections] = useState<Record<number, DetailedContent>>({})
    const [sectionLoading, setSectionLoading] = useState<number | null>(null)
    const totalSections = notes?.sub_roadmap?.length || notes?.total_sections || 5

    // Quiz state
    const [currentQ, setCurrentQ] = useState(0)
    const [answers, setAnswers] = useState<number[]>([])
    const [quizFinished, setQuizFinished] = useState(false)
    const [score, setScore] = useState(0)
    const [showExplanation, setShowExplanation] = useState(false)
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
    const [activeQuizSectionIdx, setActiveQuizSectionIdx] = useState<number | null>(null)
    const [quizLoading, setQuizLoading] = useState(false)

    // Section completion tracking (persisted via DB)
    const [completedSections, setCompletedSections] = useState<number[]>([])
    const [visitedSections, setVisitedSections] = useState<Set<number>>(new Set([0]))
    const allSectionsRead = visitedSections.size >= totalSections
    const PASS_THRESHOLD = 0.66 // 66% (2/3 correct) to pass section quiz

    // Fetch user progress on load
    const [masteryAwarded, setMasteryAwarded] = useState(false)
    useEffect(() => {
        if (!user) return
        getStudyProgress(skill)
            .then(res => {
                if (res && res.length > 0) {
                    const completed = res[0].completed_sections || []
                    setCompletedSections(completed)
                    // If backend marked it mastered, verify
                    if (res[0].mastered && !masteryAwarded) {
                        setMasteryAwarded(true)
                        onVerified(skill)
                    }
                }
            })
            .catch(console.error)
    }, [skill, user, masteryAwarded, onVerified])

    // Interactive notes state
    const [expandedTryIt, setExpandedTryIt] = useState<Record<number, boolean>>({})
    const [showVisualizer, setShowVisualizer] = useState(false)
    const [visualizerCode, setVisualizerCode] = useState('')
    const [visualizerLang, setVisualizerLang] = useState('python')
    const [visualizerTraceData, setVisualizerTraceData] = useState<any>(null)
    const [visualizerLoading, setVisualizerLoading] = useState(false)
    const [visualizerError, setVisualizerError] = useState<string | null>(null)

    // Chat state
    const [query, setQuery] = useState('')
    const [chatLoading, setChatLoading] = useState(false)
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
    const chatEndRef = useRef<HTMLDivElement>(null)

    // Saved state
    const [isPinned, setIsPinned] = useState(false)
    // Theme & Notes state
    const [theme, setTheme] = useState<'dark' | 'light'>('light')
    const [personalNotes, setPersonalNotes] = useState(() => localStorage.getItem(`notes_${skill}`) || '')

    useEffect(() => {
        localStorage.setItem(`notes_${skill}`, personalNotes)
    }, [personalNotes, skill])

    // Stabilize masteredSkills to prevent duplicate API calls on every render
    const skillsKey = masteredSkills.join(',')

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setLoadError('')
        // Check if already pinned
        const pinned = JSON.parse(localStorage.getItem('pinned_notes') || '[]')
        setIsPinned(pinned.includes(skill))

        const skills = skillsKey ? skillsKey.split(',') : []
        Promise.all([
            getStudyNotes(skill, skills),
            getStudyQuiz(skill)
        ]).then(([n, q]) => {
            if (cancelled) return
            setNotes(n)
            setQuiz(q)
            // Populate section map from any detailed_content returned with overview
            // SKIP section index 4 (LeetCode) - it must always load from the
            // dedicated section endpoint so the LeetCode-specific prompt is used.
            if (n?.detailed_content?.length) {
                const sMap: Record<number, DetailedContent> = {}
                n.detailed_content.forEach((s, i) => {
                    sMap[i] = s
                })
                setSections(sMap)
            }
            if ((n as any)?.is_fallback && (q as any)?.is_fallback) {
                setLoadError('AI service returned limited content. Some sections may be incomplete.')
            }
        }).catch(err => {
            if (cancelled) return
            console.error(err)
            setLoadError('Failed to load study materials. You can still use the Interview Simulator and AI Chat.')
        }).finally(() => {
            if (!cancelled) setLoading(false)
        })
        return () => { cancelled = true }
    }, [skill, skillsKey])  // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // ── Section loader: fetches a section on demand ──
    const loadSection = useCallback(async (idx: number) => {
        if (sections[idx] || sectionLoading === idx) return // already loaded or loading
        setSectionLoading(idx)
        try {
            const skills = skillsKey ? skillsKey.split(',') : []
            const section = await getStudySection(skill, idx, skills)
            setSections(prev => ({ ...prev, [idx]: section }))
        } catch (err) {
            console.error(`Failed to load section ${idx}:`, err)
            setSections(prev => ({
                ...prev,
                [idx]: {
                    subheading: `Section ${idx + 1}`,
                    explanation: 'Failed to load this section. Please try again.',
                    example: '',
                    is_fallback: true,
                }
            }))
        } finally {
            setSectionLoading(null)
        }
    }, [sections, sectionLoading, skill, skillsKey])

    // Preload next section when user views current one
    useEffect(() => {
        const nextIdx = activeSectionIdx + 1
        if (nextIdx < totalSections && !sections[nextIdx]) {
            // Small delay to not compete with current section load
            const timer = setTimeout(() => loadSection(nextIdx), 1500)
            return () => clearTimeout(timer)
        }
    }, [activeSectionIdx, totalSections, sections, loadSection])

    const goToSection = (idx: number) => {
        if (idx < 0 || idx >= totalSections) return
        setActiveSectionIdx(idx)
        setVisitedSections(prev => new Set(prev).add(idx))
        if (!sections[idx]) {
            loadSection(idx)
        }
    }

    const togglePin = () => {
        const pinned = JSON.parse(localStorage.getItem('pinned_notes') || '[]')
        let next: string[]
        if (isPinned) {
            next = pinned.filter((s: string) => s !== skill)
        } else {
            next = [...pinned, skill]
        }
        localStorage.setItem('pinned_notes', JSON.stringify(next))
        setIsPinned(!isPinned)
    }

    const handleChat = async () => {
        if (!query.trim()) return
        const newMsg = { role: 'user' as const, content: query }
        const history = [...messages, newMsg]
        setMessages(history)
        setQuery('')
        setChatLoading(true)

        try {
            // Pass masteredSkills for better AI context
            const response = await studyChat(skill, query, history, masteredSkills)
            setMessages(prev => [...prev, { role: 'assistant', content: response }])
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Failed to connect to AI Tutor. Check your connection or API key." }])
        } finally {
            setChatLoading(false)
        }
    }

    const startSectionQuiz = async (idx: number) => {
        setTab('quiz')
        setActiveQuizSectionIdx(idx)
        setQuiz(null)
        setQuizLoading(true)
        setQuizFinished(false)
        setCurrentQ(0)
        setAnswers([])
        setSelectedAnswer(null)
        setShowExplanation(false)
        
        try {
            const q = await getStudyQuiz(skill, idx)
            setQuiz(q)
        } catch (err) {
            console.error(err)
            setLoadError('Failed to generate quiz for this section.')
        } finally {
            setQuizLoading(false)
        }
    }

    const markSectionCompleted = async (idx: number) => {
        try {
            const res = await saveStudyProgress(skill, idx)
            if (res.status === 'success') {
                setCompletedSections(res.completed_sections)
                if (res.mastered && !masteryAwarded) {
                    setMasteryAwarded(true)
                    onVerified(skill)
                }
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleAnswer = (idx: number) => {
        if (showExplanation) return // prevent double-click during reveal
        setSelectedAnswer(idx)
        setShowExplanation(true)

        const newAns = [...answers]
        newAns[currentQ] = idx
        setAnswers(newAns)
    }

    const handleNextQuestion = () => {
        setShowExplanation(false)
        setSelectedAnswer(null)
        if (quiz && currentQ < quiz.questions.length - 1) {
            setCurrentQ(v => v + 1)
        } else if (quiz) {
            const finalAnswers = [...answers]
            const totalCorrect = finalAnswers.filter((a, i) => a === quiz.questions[i]?.correct_index).length
            setScore(totalCorrect)
            setQuizFinished(true)
            
            if (activeQuizSectionIdx !== null) {
                const passed = totalCorrect >= Math.ceil(quiz.questions.length * PASS_THRESHOLD)
                submitQuizGrade(skill, activeQuizSectionIdx, Math.round((totalCorrect / quiz.questions.length) * 100), passed)
                    .then(res => {
                        if (res.status === 'success') {
                            setCompletedSections(res.completed_sections)
                            if (res.mastered && !masteryAwarded) {
                                setMasteryAwarded(true)
                                onVerified(skill)
                            }
                        }
                    })
                    .catch(console.error)
            }
        }
    }



    if (loading) return (
        <div className="study-modal" role="dialog" aria-label="Loading study materials">
            <div className="study-content study-content--loading">
                <div className="spinner study-spinner"></div>
                <h2>Gathering Learning Materials…</h2>
                <p>Personalizing notes for {skill} based on your career goal.</p>
                <p style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>This may take 15-30 seconds for new topics</p>
            </div>
        </div>
    )

    return (
        <div className={`study-modal ${theme}-hub`} role="dialog" aria-label={`Study Hub: ${skill}`}>
            <div className="study-workspace">
                {/* ── Focus Sidebar ── */}
                <aside className="workspace-sidebar">
                    <div className="sidebar-brand">
                        <Sparkles size={20} className="glow-icon" />
                        <span>Focus Mode</span>
                    </div>

                    {loadError && (
                        <div className="sidebar-warning" style={{ padding: '8px 12px', margin: '0 8px 8px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, fontSize: 12, color: '#fbbf24' }}>
                            {loadError}
                        </div>
                    )}

                    <div className="sidebar-mastery-card">
                        <p>Mastery Progress</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: completedSections.length >= totalSections ? 'var(--green)' : 'rgba(255,255,255,0.08)', color: completedSections.length >= totalSections ? '#fff' : 'var(--text-muted)', flexShrink: 0 }}>
                                    {completedSections.length >= totalSections ? '✓' : `${completedSections.length}`}
                                </div>
                                <span style={{ fontSize: 12, color: completedSections.length >= totalSections ? 'var(--green)' : 'var(--text-secondary)' }}>
                                    Passed {completedSections.length} of {totalSections} quizzes {completedSections.length >= totalSections ? '(Mastered!)' : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="workspace-nav-group">
                        <h6>Main Navigation</h6>
                        <button type="button"
                            className={`ws-nav-item ${tab === 'notes' ? 'active' : ''}`}
                            onClick={() => setTab('notes')}
                        >
                            <BookOpen size={18} />
                            <span>Course Guide</span>
                        </button>
                        <button type="button"
                            className={`ws-nav-item ${tab === 'ask' ? 'active' : ''}`}
                            onClick={() => setTab('ask')}
                        >
                            <MessageSquare size={18} />
                            <span>AI Assistant</span>
                        </button>
                        <button type="button"
                            className={`ws-nav-item ${tab === 'quiz' ? 'active' : ''}`}
                            onClick={() => {
                                // Default to a general quiz or current section quiz
                                setActiveQuizSectionIdx(null)
                                setQuiz(null)
                                setTab('quiz')
                                getStudyQuiz(skill).then(setQuiz).catch(console.error)
                            }}
                        >
                            <CheckCircle2 size={18} />
                            <span>Knowledge Check</span>
                        </button>
                        <button type="button"
                            className={`ws-nav-item ${tab === 'interview' ? 'active' : ''}`}
                            onClick={() => setTab('interview')}
                        >
                            <Target size={18} />
                            <span>Mock Interview</span>
                        </button>
                    </div>

                    <div className="workspace-nav-group">
                        <h6>Personal Scratchpad</h6>
                        <textarea
                            className="focus-scratchpad"
                            placeholder="Type your notes here... (saved automatically)"
                            value={personalNotes}
                            onChange={(e) => setPersonalNotes(e.target.value)}
                        />
                    </div>

                    {notes?.sub_roadmap && (
                        <div className="workspace-nav-group">
                            <h6>Mastery Curriculum</h6>
                            {notes.sub_roadmap.map((step, idx) => {
                                const isCompleted = completedSections.includes(idx)
                                return (
                                    <button type="button"
                                        key={idx}
                                        className={`curriculum-item ${idx === activeSectionIdx && tab === 'notes' ? 'curriculum-item--active' : ''} ${sections[idx] ? 'curriculum-item--loaded' : ''} ${isCompleted ? 'curriculum-item--visited' : ''}`}
                                        onClick={() => { setTab('notes'); goToSection(idx) }}
                                    >
                                        <div className={`item-dot ${isCompleted ? 'visited' : sections[idx] ? 'loaded' : ''}`} style={isCompleted ? { background: 'var(--green)' } : undefined}>
                                            {isCompleted ? <CheckCircle2 size={10} style={{ color: '#fff' }} /> : (sections[idx] ? '●' : '○')}
                                        </div>
                                        <span>{step.title}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    <div className="sidebar-footer">
                        <button type="button"
                            className={`btn-pin ${isPinned ? 'pinned' : ''}`}
                            onClick={togglePin}
                        >
                            <Pin size={16} /> {isPinned ? 'Saved to Hub' : 'Pin to Study Hub'}
                        </button>
                    </div>
                </aside>

                {/* ── Main Workspace Body ── */}
                <main className="workspace-body">
                    <header className="workspace-header">
                        <div className="header-skill">
                            <div className="skill-avatar">{skill[0]}</div>
                            <div>
                                <h1>{skill}</h1>
                                <span>Mastery Course • Level {skill.toLowerCase() === 'dsa' ? 'Pro' : 'Core'}</span>
                            </div>
                        </div>
                        <button type="button" className="btn-close-ws" onClick={onClose}><X size={24} /></button>
                    </header>

                    <div className="workspace-content">
                        {tab === 'notes' && !notes && (
                            <div className="workspace-pane fade-in" style={{ textAlign: 'center', padding: '48px 24px' }}>
                                <BrainCircuit size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                                <h3>Notes unavailable</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Study materials couldn't be loaded. Try the AI Assistant or Mock Interview instead.</p>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                    <button type="button" className="btn btn--ghost" onClick={() => setTab('ask')}>AI Assistant</button>
                                    <button type="button" className="btn btn--primary" onClick={() => setTab('interview')}>Mock Interview</button>
                                </div>
                            </div>
                        )}
                        {tab === 'notes' && notes && (
                            <div className="workspace-pane fade-in">
                                {/* Hero Summary */}
                                <div className="notes-hero">
                                    <p>{notes.quick_summary}</p>
                                    <div className="time-est"><Clock size={16} />{notes.estimated_study_time} est. focus time</div>
                                </div>

                                {/* Section progress bar */}
                                <div className="section-progress-bar">
                                    {Array.from({ length: totalSections }).map((_, i) => (
                                        <button type="button"
                                            key={i}
                                            className={`section-dot ${i === activeSectionIdx ? 'active' : ''} ${sections[i] ? 'loaded' : ''} ${visitedSections.has(i) ? 'visited' : ''}`}
                                            onClick={() => goToSection(i)}
                                            title={notes.sub_roadmap?.[i]?.title || `Section ${i + 1}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <div className="section-progress-label">
                                        Section {activeSectionIdx + 1} of {totalSections}
                                    </div>
                                </div>

                                {/* Active Section Content */}
                                {sectionLoading === activeSectionIdx && !sections[activeSectionIdx] ? (
                                    <div className="section-loading-state">
                                        <div className="section-loading-spinner">
                                            <Loader2 size={32} className="spin-animation" />
                                        </div>
                                        <h3>Preparing {notes.sub_roadmap?.[activeSectionIdx]?.title || `Section ${activeSectionIdx + 1}`}...</h3>
                                        <p>AI is generating detailed content with code examples. Please wait a few seconds.</p>
                                        <div className="section-loading-bar">
                                            <div className="section-loading-fill" />
                                        </div>
                                    </div>
                                ) : sections[activeSectionIdx] ? (
                                    <div className="section-content-page fade-in">
                                        <div className="focus-card detailed-card">
                                            <div className="card-num">{activeSectionIdx + 1}</div>
                                            <h3>{sections[activeSectionIdx].subheading}</h3>
                                            <div className="content-prose">
                                                <Suspense fallback={<p>{sections[activeSectionIdx].explanation}</p>}>
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            code({ node, className, children, ...props }) {
                                                                const match = /language-(\w+)/.exec(className || '')
                                                                const codeStr = String(children).replace(/\n$/, '')
                                                                if (match) {
                                                                    return <CodeBlock code={codeStr} language={match[1]} />
                                                                }
                                                                return <code className={className} {...props}>{children}</code>
                                                            },
                                                        }}
                                                    >
                                                        {sections[activeSectionIdx].explanation}
                                                    </ReactMarkdown>
                                                </Suspense>

                                                {sections[activeSectionIdx].algorithm && (
                                                    <div className="algo-block" style={{ marginBottom: 16 }}>
                                                        <strong style={{ display: 'block', color: 'var(--cyan)', marginBottom: 4 }}>Algorithm / Steps:</strong>
                                                        <div style={{ fontSize: 13, background: 'rgba(34, 211, 238, 0.05)', padding: 12, borderRadius: 8, borderLeft: '2px solid var(--cyan)' }}>
                                                            <Suspense fallback={<p style={{ whiteSpace: 'pre-line' }}>{sections[activeSectionIdx].algorithm}</p>}>
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkGfm]}
                                                                    components={{
                                                                        code({ node, className, children, ...props }) {
                                                                            const match = /language-(\w+)/.exec(className || '')
                                                                            const codeStr = String(children).replace(/\n$/, '')
                                                                            if (match) {
                                                                                return <CodeBlock code={codeStr} language={match[1]} />
                                                                            }
                                                                            return <code className={className} {...props}>{children}</code>
                                                                        },
                                                                    }}
                                                                >
                                                                    {sections[activeSectionIdx].algorithm!}
                                                                </ReactMarkdown>
                                                            </Suspense>
                                                        </div>
                                                    </div>
                                                )}

                                                {sections[activeSectionIdx].example && (
                                                    <div className="example-block">
                                                        <div className="example-label"><Code2 size={14} /> Code Example</div>
                                                        <div className="example-content">
                                                            <Suspense fallback={<pre>{sections[activeSectionIdx].example}</pre>}>
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkGfm]}
                                                                    components={{
                                                                        code({ node, className, children, ...props }) {
                                                                            const match = /language-(\w+)/.exec(className || '')
                                                                            const codeStr = String(children).replace(/\n$/, '')
                                                                            if (match) {
                                                                                return (
                                                                                    <CodeBlock
                                                                                        code={codeStr}
                                                                                        language={match[1]}
                                                                                        onVisualize={async () => {
                                                                                            setVisualizerCode(codeStr)
                                                                                            setVisualizerLang(match[1])
                                                                                            setVisualizerTraceData(null)
                                                                                            setVisualizerError(null)
                                                                                            setVisualizerLoading(true)
                                                                                            setShowVisualizer(true)
                                                                                            try {
                                                                                                const result = await traceCode(codeStr, match[1])
                                                                                                if (result.error) {
                                                                                                    setVisualizerError(result.error)
                                                                                                } else {
                                                                                                    setVisualizerTraceData(result)
                                                                                                }
                                                                                            } catch (err) {
                                                                                                setVisualizerError(err instanceof Error ? err.message : 'Failed to trace code')
                                                                                            } finally {
                                                                                                setVisualizerLoading(false)
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                )
                                                                            }
                                                                            return <code className={className} {...props}>{children}</code>
                                                                        },
                                                                    }}
                                                                >
                                                                    {sections[activeSectionIdx].example.includes('```') ? sections[activeSectionIdx].example : `\`\`\`\n${sections[activeSectionIdx].example}\n\`\`\``}
                                                                </ReactMarkdown>
                                                            </Suspense>
                                                        </div>
                                                    </div>
                                                )}

                                                {sections[activeSectionIdx].key_takeaway && (
                                                    <div className="takeaway-box">
                                                        <Zap size={16} />
                                                        <div>
                                                            <strong>Key Takeaway</strong>
                                                            <p>{sections[activeSectionIdx].key_takeaway}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {sections[activeSectionIdx].try_it && (
                                                    <div className="try-it-box">
                                                        <button type="button"
                                                            className="try-it-toggle"
                                                            onClick={() => setExpandedTryIt(prev => ({ ...prev, [activeSectionIdx]: !prev[activeSectionIdx] }))}
                                                        >
                                                            <Target size={16} />
                                                            <span>Try It Yourself</span>
                                                            <ChevronRight size={16} className={expandedTryIt[activeSectionIdx] ? 'rotated' : ''} />
                                                        </button>
                                                        {expandedTryIt[activeSectionIdx] && (
                                                            <div className="try-it-content">
                                                                <p>{sections[activeSectionIdx].try_it}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {sections[activeSectionIdx].complexity && sections[activeSectionIdx].complexity !== 'N/A' && (
                                                    <div style={{ marginTop: 16, display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                                                        <strong style={{ color: 'var(--orange)' }}>Complexity:</strong> <span>{sections[activeSectionIdx].complexity}</span>
                                                    </div>
                                                )}

                                                {/* LeetCode Problems (section 4) */}
                                                {sections[activeSectionIdx].leetcode_problems && sections[activeSectionIdx].leetcode_problems!.length > 0 && (
                                                    <div className="leetcode-section">
                                                        <h4 className="leetcode-header">
                                                            <Code2 size={18} /> LeetCode Practice Problems
                                                        </h4>
                                                        <div className="leetcode-grid">
                                                            {sections[activeSectionIdx].leetcode_problems!.map((p, pi) => (
                                                                <div
                                                                    key={pi}
                                                                    className={`leetcode-card leetcode-card--${p.difficulty?.toLowerCase()}`}
                                                                >
                                                                    <div className="leetcode-card-top">
                                                                        <span className="leetcode-num">#{p.number}</span>
                                                                        <span className={`leetcode-diff leetcode-diff--${p.difficulty?.toLowerCase()}`}>
                                                                            {p.difficulty}
                                                                        </span>
                                                                    </div>
                                                                    <h5 className="leetcode-title">{p.title}</h5>
                                                                    {p.description && <p className="leetcode-desc">{p.description}</p>}
                                                                    {(p.example_input || p.example_output) && (
                                                                        <div className="leetcode-io">
                                                                            {p.example_input && (
                                                                                <div className="leetcode-io-row">
                                                                                    <span className="leetcode-io-label">Input:</span>
                                                                                    <code>{p.example_input}</code>
                                                                                </div>
                                                                            )}
                                                                            {p.example_output && (
                                                                                <div className="leetcode-io-row">
                                                                                    <span className="leetcode-io-label">Output:</span>
                                                                                    <code>{p.example_output}</code>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {p.pattern && <span className="leetcode-pattern">{p.pattern}</span>}
                                                                    {p.hint && <p className="leetcode-hint">💡 {p.hint}</p>}
                                                                    <a
                                                                        className="leetcode-link"
                                                                        href={p.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={e => e.stopPropagation()}
                                                                    >
                                                                        Solve on LeetCode <ExternalLink size={12} />
                                                                    </a>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Section Quiz Banner */}
                                                <div className="section-quiz-banner" style={{ marginTop: 24, padding: 16, background: 'rgba(59, 130, 246, 0.08)', borderRadius: 12, border: '1px dashed rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} style={{ color: 'var(--blue)' }} /> Test your understanding of this section</h4>
                                                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Complete a short 3-question MCQ quiz to verify your progress.</p>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 10 }}>
                                                        <button type="button" className={`btn btn--sm ${completedSections.includes(activeSectionIdx) ? 'btn--ghost' : 'btn--primary'}`} style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => markSectionCompleted(activeSectionIdx)}>
                                                            {completedSections.includes(activeSectionIdx) ? '✓ Completed' : 'Mark as Read'}
                                                        </button>
                                                        <button type="button" className="btn btn--primary btn--sm" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => startSectionQuiz(activeSectionIdx)}>
                                                            {completedSections.includes(activeSectionIdx) ? 'Retake Section Quiz' : 'Take Section Quiz'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="section-loading-state" style={{ cursor: 'pointer' }} onClick={() => loadSection(activeSectionIdx)}>
                                        <BrainCircuit size={40} style={{ opacity: 0.3 }} />
                                        <h3>Click to load {notes.sub_roadmap?.[activeSectionIdx]?.title || `Section ${activeSectionIdx + 1}`}</h3>
                                        <p>Content will be generated by AI</p>
                                    </div>
                                )}

                                {/* Section Navigation Arrows */}
                                <div className="section-nav-arrows">
                                    <button type="button"
                                        className="section-arrow section-arrow--prev"
                                        onClick={() => goToSection(activeSectionIdx - 1)}
                                        disabled={activeSectionIdx === 0}
                                    >
                                        <ChevronLeft size={20} /> Previous
                                    </button>
                                    <div className="section-nav-info">
                                        {notes.sub_roadmap?.[activeSectionIdx]?.title || `Section ${activeSectionIdx + 1}`}
                                    </div>
                                    {activeSectionIdx < totalSections - 1 ? (
                                        <button type="button"
                                            className="section-arrow section-arrow--next"
                                            onClick={() => goToSection(activeSectionIdx + 1)}
                                        >
                                            Next <ChevronRight size={20} />
                                        </button>
                                    ) : (
                                        <button type="button"
                                            className="section-arrow section-arrow--next section-arrow--quiz"
                                            onClick={() => setTab('quiz')}
                                        >
                                            Take Quiz <ChevronRight size={20} />
                                        </button>
                                    )}
                                </div>

                                {/* Industry Insight */}
                                {notes.pro_tip && (
                                    <div className="pro-zone">
                                        <div className="zone-icon"><Lightbulb size={24} /></div>
                                        <div className="zone-text">
                                            <h4>Industry Insight</h4>
                                            <p>{notes.pro_tip}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'ask' && (
                            <div className="workspace-pane chat-pane fade-in">
                                <div className="chat-history">
                                    {messages.length === 0 && (
                                        <div className="chat-empty">
                                            <BrainCircuit size={48} className="empty-icon" />
                                            <h3>Ask anything about {skill}</h3>
                                            <p>I can explain concepts, give code examples, or help you with specific doubts.</p>
                                        </div>
                                    )}
                                    {messages.map((m, i) => (
                                        <div key={i} className={`msg msg--${m.role}`}>
                                            <div className="msg-content">
                                                {m.role === 'assistant' ? (
                                                    <Suspense fallback={<span>Loading…</span>}>
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                code({ node, className, children, ...props }) {
                                                                    const match = /language-(\w+)/.exec(className || '')
                                                                    const codeStr = String(children).replace(/\n$/, '')
                                                                    if (match) {
                                                                        return <CodeBlock code={codeStr} language={match[1]} />
                                                                    }
                                                                    return <code className={className} {...props}>{children}</code>
                                                                },
                                                            }}
                                                        >
                                                            {m.content}
                                                        </ReactMarkdown>
                                                    </Suspense>
                                                ) : m.content}
                                            </div>
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="msg msg--assistant">
                                            <div className="msg-content loading-dots">Thinking…</div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="chat-input-row">
                                    <input
                                        type="text"
                                        placeholder="Ask a question..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                                    />
                                    <button type="button" className="btn-send" onClick={handleChat} disabled={chatLoading}><Send size={18} /></button>
                                </div>
                            </div>
                        )}

                        {tab === 'quiz' && quizLoading && (
                            <div className="workspace-pane fade-in" style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                                <Loader2 size={48} className="spin-animation" style={{ color: 'var(--blue)', marginBottom: 16 }} />
                                <h3>Generating Section Quiz...</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>AI is curating specific questions for {notes?.sub_roadmap?.[activeQuizSectionIdx ?? 0]?.title || skill}...</p>
                            </div>
                        )}
                        {tab === 'quiz' && !quiz && !quizLoading && (
                            <div className="workspace-pane fade-in" style={{ textAlign: 'center', padding: '48px 24px' }}>
                                <CheckCircle2 size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                                <h3>Quiz unavailable</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Quiz couldn't be loaded. Try the Mock Interview for a comprehensive skill assessment.</p>
                                <button type="button" className="btn btn--primary" onClick={() => setTab('interview')}>Try Mock Interview</button>
                            </div>
                        )}
                        {tab === 'quiz' && quiz && (
                            <div className="workspace-pane fade-in">
                                {!quizFinished ? (
                                    <div className="quiz-container">
                                        {/* Progress dots */}
                                        <div className="quiz-dots">
                                            {quiz.questions.map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`quiz-dot ${i === currentQ ? 'active' : ''} ${i < currentQ ? (answers[i] === quiz.questions[i].correct_index ? 'correct' : 'wrong') : ''}`}
                                                />
                                            ))}
                                        </div>

                                        <div className="quiz-meta-row">
                                            <span className="quiz-counter">Question {currentQ + 1} of {quiz.questions.length}</span>
                                            {quiz.questions[currentQ].difficulty && (
                                                <span className={`quiz-difficulty quiz-difficulty--${quiz.questions[currentQ].difficulty}`}>
                                                    {quiz.questions[currentQ].difficulty}
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="quiz-question-text">
                                            <Suspense fallback={<span>{quiz.questions[currentQ].question}</span>}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {quiz.questions[currentQ].question}
                                                </ReactMarkdown>
                                            </Suspense>
                                        </h2>

                                        <div className="quiz-options-grid">
                                            {quiz.questions[currentQ].options.map((opt, i) => {
                                                const isSelected = selectedAnswer === i
                                                const isCorrect = i === quiz.questions[currentQ].correct_index
                                                const revealed = showExplanation
                                                let optClass = 'quiz-option'
                                                if (revealed && isCorrect) optClass += ' quiz-option--correct'
                                                else if (revealed && isSelected && !isCorrect) optClass += ' quiz-option--wrong'
                                                else if (isSelected) optClass += ' quiz-option--selected'

                                                return (
                                                    <button type="button"
                                                        key={i}
                                                        className={optClass}
                                                        onClick={() => handleAnswer(i)}
                                                        disabled={showExplanation}
                                                    >
                                                        <span className="quiz-option-letter">{String.fromCharCode(65 + i)}</span>
                                                        <span className="quiz-option-text">{opt}</span>
                                                        {revealed && isCorrect && <CheckCircle2 size={18} className="quiz-icon-correct" />}
                                                        {revealed && isSelected && !isCorrect && <X size={18} className="quiz-icon-wrong" />}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {showExplanation && (
                                            <div className={`quiz-explanation ${selectedAnswer === quiz.questions[currentQ].correct_index ? 'quiz-explanation--correct' : 'quiz-explanation--wrong'}`}>
                                                <div className="quiz-explanation-header">
                                                    {selectedAnswer === quiz.questions[currentQ].correct_index
                                                        ? <><CheckCircle2 size={18} /> Correct!</>
                                                        : <><AlertCircle size={18} /> Not quite</>
                                                    }
                                                </div>
                                                <p>{quiz.questions[currentQ].explanation}</p>
                                                <button type="button" className="btn btn--primary btn--sm quiz-next-btn" onClick={handleNextQuestion}>
                                                    {currentQ < quiz.questions.length - 1 ? 'Next Question →' : 'See Results'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="quiz-results">
                                        {(() => {
                                            const needed = Math.ceil(quiz.questions.length * PASS_THRESHOLD)
                                            const isSectionQuiz = activeQuizSectionIdx !== null
                                            const secPassed = score >= needed
                                            const secTitle = isSectionQuiz ? (notes?.sub_roadmap?.[activeQuizSectionIdx!]?.title || `Section ${activeQuizSectionIdx! + 1}`) : ''

                                            return (
                                                <>
                                                    <div className={`quiz-score-ring ${secPassed ? 'perfect' : score >= quiz.questions.length * 0.5 ? 'pass' : 'fail'}`}>
                                                        <div className="quiz-score-num">{score}/{quiz.questions.length}</div>
                                                        <div className="quiz-score-label">{secPassed ? 'Passed!' : 'Keep Learning'}</div>
                                                    </div>

                                                    <h2 style={{ textAlign: 'center', marginBottom: 8 }}>
                                                        {isSectionQuiz 
                                                            ? (secPassed ? 'Section Quiz Passed!' : 'Retry Section Quiz') 
                                                            : (secPassed ? 'Quiz Passed!' : 'Review & Retry')
                                                        }
                                                    </h2>
                                                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 12, fontSize: 14 }}>
                                                        {isSectionQuiz
                                                            ? (secPassed 
                                                                ? `Excellent work! You've successfully completed the quiz for "${secTitle}".`
                                                                : `You got ${score} out of ${quiz.questions.length} correct (need ${needed} to pass). Let's review the answers below and try again.`)
                                                            : (secPassed
                                                                ? `Great job! You passed the general quiz for ${skill}.`
                                                                : `You got ${score} out of ${quiz.questions.length} correct (need ${needed} to pass). Let's review and try again.`)
                                                        }
                                                    </p>
                                                </>
                                            )
                                        })()}

                                        {/* Question review */}
                                        <div className="quiz-review-list">
                                            {quiz.questions.map((q, i) => {
                                                const wasCorrect = answers[i] === q.correct_index
                                                return (
                                                    <div key={i} className={`quiz-review-item ${wasCorrect ? 'quiz-review--correct' : 'quiz-review--wrong'}`}>
                                                        <div className="quiz-review-header">
                                                            <span className="quiz-review-num">Q{i + 1}</span>
                                                            {wasCorrect
                                                                ? <CheckCircle2 size={16} className="quiz-icon-correct" />
                                                                : <X size={16} className="quiz-icon-wrong" />
                                                            }
                                                        </div>
                                                        <p className="quiz-review-question">{q.question}</p>
                                                        {!wasCorrect && (
                                                            <div className="quiz-review-answer">
                                                                <span>Your answer: <strong>{q.options[answers[i]] || 'Skipped'}</strong></span>
                                                                <span>Correct: <strong style={{ color: 'var(--green)' }}>{q.options[q.correct_index]}</strong></span>
                                                            </div>
                                                        )}
                                                        <p className="quiz-review-explanation">{q.explanation}</p>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {(() => {
                                            const isSectionQuiz = activeQuizSectionIdx !== null
                                            const secPassed = score >= Math.ceil(quiz.questions.length * PASS_THRESHOLD)
                                            const hasNextSection = isSectionQuiz && activeQuizSectionIdx! < totalSections - 1

                                            return (
                                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                                                    {isSectionQuiz ? (
                                                        secPassed ? (
                                                            hasNextSection ? (
                                                                <button type="button" className="btn btn--primary" onClick={() => {
                                                                    setTab('notes')
                                                                    goToSection(activeQuizSectionIdx! + 1)
                                                                }}>
                                                                    Next Section <ChevronRight size={16} />
                                                                </button>
                                                            ) : (
                                                                <button type="button" className="btn btn--primary" onClick={() => setTab('notes')}>
                                                                    Finish Course <CheckCircle2 size={16} />
                                                                </button>
                                                            )
                                                        ) : (
                                                            <>
                                                                <button type="button" className="btn btn--ghost" onClick={() => setTab('notes')}>
                                                                    Review Section Notes
                                                                </button>
                                                                <button type="button" className="btn btn--primary" onClick={() => {
                                                                    setQuizFinished(false)
                                                                    setCurrentQ(0)
                                                                    setAnswers([])
                                                                    setSelectedAnswer(null)
                                                                    setShowExplanation(false)
                                                                }}>
                                                                    <RotateCcw size={16} /> Retry Quiz
                                                                </button>
                                                            </>
                                                        )
                                                    ) : (
                                                        <>
                                                            <button type="button" className="btn btn--ghost" onClick={() => setTab('notes')}>
                                                                <BookOpen size={16} /> Review Notes
                                                            </button>
                                                            <button type="button" className="btn btn--primary" onClick={() => {
                                                                setQuizFinished(false)
                                                                setCurrentQ(0)
                                                                setAnswers([])
                                                                setSelectedAnswer(null)
                                                                setShowExplanation(false)
                                                            }}>
                                                                <RotateCcw size={16} /> Retry Quiz
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'interview' && (
                            <div className="workspace-pane fade-in">
                                <InterviewSimulator skill={skill} />
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Code Visualizer Modal */}
            <Dialog open={showVisualizer} onOpenChange={setShowVisualizer}>
                <DialogContent className="sm:max-w-[950px] max-h-[90vh] overflow-auto">
                    <DialogTitle className="sr-only">Code Execution Visualizer</DialogTitle>
                    {visualizerLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                            <Loader2 className="size-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Tracing execution...</p>
                        </div>
                    ) : visualizerError ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                            <AlertCircle className="size-8 text-destructive" />
                            <p className="text-sm text-destructive">{visualizerError}</p>
                        </div>
                    ) : visualizerTraceData ? (
                        <CodeVisualizer
                            code={visualizerCode}
                            language={visualizerLang}
                            steps={visualizerTraceData.steps}
                            traceError={visualizerTraceData.error}
                            onClose={() => setShowVisualizer(false)}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    )
}
