import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useResume } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'
import {
    Mic, MicOff, RefreshCw, ChevronRight, Target, Trophy,
    Zap, Clock, BarChart2, Lock, Sparkles, CheckCircle,
    AlertCircle, TrendingUp, MessageSquare, Brain, ChevronDown,
    Flame, Lightbulb,
} from 'lucide-react'
import { apiFetch } from '../api/client'
import { markChecklistItem } from '../utils/onboardingChecklist'
import AuthRequiredPrompt from '../components/AuthRequiredPrompt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'

const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
}

/* ── Types ──────────────────────────────────────────────── */
interface Question {
    id: string
    question: string
    difficulty: string
    role: string
}
interface EvalResult {
    score: number
    grade: string
    detected_concepts: string[]
    missing_concepts: string[]
    total_concepts: number
    feedback: string
    tip: string
}
interface SessionRecord {
    id: string
    date: string
    role: string
    difficulty: string
    score: number
    grade: string
    conceptsCovered: string[]
    conceptsMissed: string[]
    questionPreview: string
}

/* ── localStorage helpers ─────────────────────────────── */
const LS_INTERVIEW_LOG = 'cse_interview_log'

function loadInterviewLog(email?: string): SessionRecord[] {
    const key = email ? `${email}_${LS_INTERVIEW_LOG}` : LS_INTERVIEW_LOG
    try { return JSON.parse(localStorage.getItem(key) || '[]') }
    catch { return [] }
}

function saveSession(record: SessionRecord, email?: string) {
    const key = email ? `${email}_${LS_INTERVIEW_LOG}` : LS_INTERVIEW_LOG
    const log = loadInterviewLog(email)
    log.push(record)
    if (log.length > 50) log.splice(0, log.length - 50)
    localStorage.setItem(key, JSON.stringify(log))
}

/* ── Web Speech hook ───────────────────────────────────── */
const SPEECH_LANGS: Record<string, string> = {
    'en-IN': 'English (India)',
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    'hi-IN': 'Hindi (India)',
}

function useWebSpeech() {
    const [transcript, setTranscript] = useState('')
    const [listening, setListening] = useState(false)
    const [speechLang, setSpeechLang] = useState<string>(() => {
        try { return localStorage.getItem('cse_speech_lang') || 'en-IN' }
        catch { return 'en-IN' }
    })
    const [supported] = useState(() => {
        const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
        return !!SR
    })
    const recRef = useRef<SpeechRecognition | null>(null)

    const applyLang = (lang: string) => {
        setSpeechLang(lang)
        try { localStorage.setItem('cse_speech_lang', lang) } catch {}
        if (recRef.current) recRef.current.lang = lang
    }

    useEffect(() => {
        const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
        if (!SR) return
        const rec = new SR()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = speechLang
        rec.onresult = (e: SpeechRecognitionEvent) => {
            const text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(' ')
            setTranscript(text)
        }
        rec.onend = () => setListening(false)
        recRef.current = rec
    }, [])

    const start = () => { if (!recRef.current) return; setTranscript(''); recRef.current.start(); setListening(true) }
    const stop = () => { if (!recRef.current) return; recRef.current.stop(); setListening(false) }

    return { transcript, setTranscript, listening, supported, start, stop, speechLang, setSpeechLang: applyLang }
}

/* ════════════════════════════════════════════════════════════ */
export default function InterviewReadiness() {
    const navigate = useNavigate()
    const { analysis, prediction } = useResume()
    const { user } = useAuth()
    const role = analysis?.role ?? prediction?.predicted_role ?? ''
    const readiness = analysis?.final_score ?? 0

    const [question, setQuestion] = useState<Question | null>(null)
    const [result, setResult] = useState<EvalResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [evalLoading, setEval] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [phase, setPhase] = useState<'idle' | 'questioning' | 'done'>('idle')
    const [showHistory, setShowHistory] = useState(false)
    const [log, setLog] = useState<SessionRecord[]>([])

    const { transcript, setTranscript, listening, supported, start, stop, speechLang, setSpeechLang } = useWebSpeech()

    useEffect(() => { setLog(loadInterviewLog(user?.email)) }, [user?.email])

    /* Stats */
    const stats = useMemo(() => {
        const total = log.length
        const avgScore = total > 0 ? Math.round(log.reduce((a, s) => a + s.score, 0) / total) : 0
        const bestScore = total > 0 ? Math.max(...log.map(s => s.score)) : 0
        const wins = log.filter(s => s.score >= 70).length
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
        const allCovered = new Set(log.flatMap(s => s.conceptsCovered.map(c => c.toLowerCase())))
        const allMissed = new Set(log.flatMap(s => s.conceptsMissed.map(c => c.toLowerCase())))
        allCovered.forEach(c => allMissed.delete(c))
        return { total, avgScore, bestScore, winRate, conceptsCovered: allCovered, conceptsMissed: allMissed }
    }, [log])

    /* Practice targets */
    const targets = useMemo(() => {
        const coreGaps = analysis?.missing_core_skills ?? []
        const optGaps = analysis?.missing_optional_skills ?? []
        const practiced = stats.conceptsCovered
        const core = coreGaps.filter(s => !practiced.has(s.toLowerCase())).slice(0, 4)
        const optional = optGaps.filter(s => !practiced.has(s.toLowerCase())).slice(0, 2)
        return { core, optional }
    }, [analysis, stats])

    /* Actions */
    const fetchQuestion = async () => {
        setLoading(true); setResult(null); setTranscript(''); setFetchError(null)
        try {
            const data = await apiFetch<Question>(`/interview/question?role=${encodeURIComponent(role)}`)
            setQuestion(data)
            setPhase('questioning')
        } catch (err: unknown) {
            setFetchError(err instanceof Error ? err.message : 'Could not load question.')
        } finally { setLoading(false) }
    }

    const evalAnswer = async () => {
        if (!question || !transcript.trim()) return
        setEval(true)
        try {
            const data: EvalResult = await apiFetch('/interview/evaluate', {
                method: 'POST',
                body: { role, question_id: question.id, answer: transcript },
            })
            setResult(data)
            setPhase('done')
            const record: SessionRecord = {
                id: `ir_${Date.now()}`,
                date: new Date().toISOString(),
                role,
                difficulty: question.difficulty,
                score: data.score,
                grade: data.grade,
                conceptsCovered: data.detected_concepts,
                conceptsMissed: data.missing_concepts,
                questionPreview: question.question.slice(0, 80),
            }
            saveSession(record, user?.email)
            markChecklistItem('completed_interview', user?.email)
            setLog(loadInterviewLog(user?.email))
        } catch {
            setResult({
                score: 0, grade: 'Error', detected_concepts: [], missing_concepts: [],
                total_concepts: 0, feedback: 'Evaluation failed - check connection.', tip: 'Try again.',
            })
            setPhase('done')
        } finally { setEval(false) }
    }

    const reset = () => { setQuestion(null); setResult(null); setTranscript(''); setPhase('idle') }

    const readinessLabel = readiness >= 80 ? 'Interview Ready' : readiness >= 60 ? 'Placement Ready' : readiness >= 40 ? 'Developing' : 'Getting Started'
    const readinessColor = readiness >= 75 ? '#05FFC5' : readiness >= 50 ? '#F59E0B' : '#FF3F6C'

    /* ── Locked state ──────────────────────────────────── */
    if (!user) {
        return <AuthRequiredPrompt feature="Interview Arena" />
    }

    if (!analysis) {
        return (
            <div className="mx-auto max-w-xl py-20 text-center">
                <motion.div {...fadeUp}>
                    <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-muted">
                        <Lock className="size-10 text-muted-foreground" />
                    </div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight">Interview Arena Locked</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Upload your resume to unlock AI-powered mock interviews tailored to your role, skill gaps, and career level.
                    </p>
                    <Button className="mt-6 gap-2" onClick={() => navigate('/resume-analyzer')}>
                        <Sparkles className="size-4" /> Analyze Your Resume
                    </Button>
                    <div className="mt-10 grid gap-4 sm:grid-cols-3">
                        {[
                            { icon: MessageSquare, title: 'Voice & Text', desc: 'Answer via speech recognition or typing' },
                            { icon: Brain, title: 'AI Evaluation', desc: 'Concept coverage scoring with feedback' },
                            { icon: TrendingUp, title: 'Progress Tracking', desc: 'Track scores, win rate & concept mastery' },
                        ].map(f => (
                            <Card key={f.title} className="premium-hover-card">
                                <CardContent className="flex flex-col items-center pt-6 text-center">
                                    <f.icon className="mb-2 size-5 text-muted-foreground" />
                                    <p className="text-sm font-semibold">{f.title}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </motion.div>
            </div>
        )
    }

    /* ═══════════════════════════════════════════════════════ */
    return (
        <div className="mx-auto max-w-4xl space-y-6">

            {/* Hero */}
            <motion.div {...fadeUp}>
                <Card className="premium-hover-card bg-gradient-to-r from-primary/5 to-violet/5 border-primary/10">
                    <CardContent className="flex flex-col items-center gap-6 pt-6 sm:flex-row">
                        <div className="flex-1">
                            <Badge variant="outline" className="mb-2 border-primary/30 text-primary">{role}</Badge>
                            <h1 className="font-heading text-2xl font-bold tracking-tight">Interview Arena</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Practice role-specific questions. AI evaluates concept coverage in real time.
                            </p>
                        </div>
                        <div className="relative size-20 shrink-0">
                            <svg viewBox="0 0 80 80" className="size-full">
                                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                <circle cx="40" cy="40" r="34" fill="none" stroke={readinessColor} strokeWidth="6" strokeLinecap="round"
                                    strokeDasharray={`${(readiness / 100) * 214} 214`} transform="rotate(-90 40 40)"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="font-heading text-xl font-bold">{readiness}</span>
                                <span className="text-xs text-muted-foreground">{readinessLabel}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Stats Strip */}
            <motion.div {...fadeUp} className="grid grid-cols-5 gap-3">
                {[
                    { icon: <Trophy className="size-4 text-amber" />, num: stats.total, label: 'Sessions' },
                    { icon: <Target className="size-4 text-primary" />, num: `${stats.avgScore}%`, label: 'Avg Score' },
                    { icon: <Zap className="size-4 text-mint" />, num: `${stats.bestScore}%`, label: 'Best' },
                    { icon: <Flame className="size-4 text-crimson" />, num: `${stats.winRate}%`, label: 'Win Rate' },
                    { icon: <Brain className="size-4 text-violet" />, num: stats.conceptsCovered.size, label: 'Concepts' },
                ].map(s => (
                    <Card key={s.label} className="premium-hover-card">
                        <CardContent className="flex flex-col items-center gap-1 pt-4">
                            {s.icon}
                            <span className="font-heading text-lg font-bold">{s.num}</span>
                            <span className="text-xs text-muted-foreground">{s.label}</span>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Concept Confidence Map */}
            {(stats.conceptsCovered.size > 0 || stats.conceptsMissed.size > 0) && (
                <motion.div {...fadeUp}>
                    <Card className="premium-hover-card">
                        <CardContent className="pt-6">
                            <div className="mb-3 flex items-center gap-2">
                                <BarChart2 className="size-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">Concept Confidence Map</span>
                                <span className="text-xs text-muted-foreground">
                                    {stats.conceptsCovered.size} mastered · {stats.conceptsMissed.size} to review
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {[...stats.conceptsCovered].slice(0, 20).map(c => (
                                    <Badge key={c} className="bg-mint/10 text-mint text-[11px]">{c}</Badge>
                                ))}
                                {[...stats.conceptsMissed].slice(0, 15).map(c => (
                                    <Badge key={c} variant="destructive" className="text-[11px]">{c}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Practice Targets */}
            {(targets.core.length > 0 || targets.optional.length > 0) && (
                <motion.div {...fadeUp}>
                    <Card className="premium-hover-card border-amber/15 bg-amber/3">
                        <CardContent className="pt-6">
                            <div className="mb-3 flex items-center gap-2">
                                <Lightbulb className="size-4 text-amber" />
                                <span className="text-sm font-semibold">Recommended Focus Areas</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {targets.core.map(s => (
                                    <Badge key={s} className="bg-crimson/10 text-crimson text-[11px]">{s}</Badge>
                                ))}
                                {targets.optional.map(s => (
                                    <Badge key={s} variant="secondary" className="text-[11px]">{s}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Q&A Arena */}
            <motion.div {...fadeUp}>
                <Card className="premium-hover-card">
                    <CardHeader className="flex-row items-center gap-3 space-y-0">
                        <MessageSquare className="size-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">Live Interview Practice</CardTitle>
                        {phase !== 'idle' && (
                            <Button variant="ghost" size="sm" className="ml-auto gap-2 text-xs" onClick={reset}>
                                <RefreshCw className="size-3" /> New Question
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {/* IDLE */}
                        {phase === 'idle' && (
                            <div className="flex flex-col items-center gap-4 py-8 text-center">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                                    <Target className="size-7 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Get a role-specific question for <strong className="text-foreground">{role}</strong>. Answer by voice or typing.
                                </p>
                                <Button className="gap-2" onClick={fetchQuestion} disabled={loading}>
                                    {loading ? <><Clock className="size-4 animate-spin" /> Loading…</> : <><ChevronRight className="size-4" /> Start Question</>}
                                </Button>
                                {fetchError && (
                                    <div className="flex items-center gap-2 rounded-lg border border-crimson/20 bg-crimson/5 px-4 py-2 text-xs text-crimson">
                                        <AlertCircle className="size-3.5" /> {fetchError}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* QUESTIONING */}
                        {phase === 'questioning' && question && (
                            <motion.div {...fadeUp} className="space-y-4">
                                <Card className="premium-hover-card bg-surface-elevated border-border/50">
                                    <CardContent className="pt-5">
                                        <div className="mb-3 flex items-center gap-2">
                                            <Badge variant={
                                                question.difficulty === 'Beginner' ? 'default' :
                                                question.difficulty === 'Advanced' ? 'destructive' : 'secondary'
                                            } className="text-xs">{question.difficulty}</Badge>
                                            <span className="font-mono text-xs text-muted-foreground">{question.id}</span>
                                        </div>
                                        <p className="text-sm leading-relaxed">{question.question}</p>
                                    </CardContent>
                                </Card>

                                <div className="space-y-3">
                                    {supported && (
                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant={listening ? 'destructive' : 'outline'}
                                                size="sm"
                                                className="gap-2"
                                                onClick={listening ? stop : start}
                                            >
                                                {listening ? <><MicOff className="size-4" /> Stop</> : <><Mic className="size-4" /> Record</>}
                                            </Button>
                                            <select
                                                value={speechLang}
                                                onChange={e => setSpeechLang(e.target.value)}
                                                className="rounded-md border border-border/50 bg-surface-elevated px-2 py-1.5 text-xs text-foreground"
                                            >
                                                {Object.entries(SPEECH_LANGS).map(([code, name]) => (
                                                    <option key={code} value={code}>{name}</option>
                                                ))}
                                            </select>
                                            {listening && (
                                                <span className="flex items-center gap-1.5 text-xs text-crimson">
                                                    <span className="size-1.5 animate-pulse rounded-full bg-crimson" /> Recording
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <Textarea
                                        value={transcript}
                                        onChange={e => setTranscript(e.target.value)}
                                        placeholder="Type or speak your answer..."
                                        className="min-h-[120px] resize-y"
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">{transcript.split(/\s+/).filter(Boolean).length} words</span>
                                        <Button className="gap-2" onClick={evalAnswer} disabled={!transcript.trim() || evalLoading}>
                                            {evalLoading ? 'Evaluating...' : 'Submit Answer'}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* RESULT */}
                        {phase === 'done' && result && (
                            <motion.div {...fadeUp} className="space-y-4">
                                <div className="flex flex-col items-center gap-3 py-4">
                                    <div className={`flex size-20 flex-col items-center justify-center rounded-full border-4 ${
                                        result.score >= 70 ? 'border-mint bg-mint/10' :
                                        result.score >= 40 ? 'border-amber bg-amber/10' : 'border-crimson bg-crimson/10'
                                    }`}>
                                        <span className="font-heading text-2xl font-bold">{result.score}%</span>
                                        <span className="text-xs font-semibold text-muted-foreground">{result.grade}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {result.detected_concepts.length}/{result.total_concepts} concepts covered
                                    </p>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Card className="premium-hover-card">
                                        <CardContent className="pt-4">
                                            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-mint">
                                                <CheckCircle className="size-3" /> Covered
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {result.detected_concepts.length > 0
                                                    ? result.detected_concepts.map(c => <Badge key={c} className="bg-mint/10 text-mint text-xs">{c}</Badge>)
                                                    : <span className="text-xs text-muted-foreground">None detected</span>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="premium-hover-card">
                                        <CardContent className="pt-4">
                                            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-crimson">
                                                <AlertCircle className="size-3" /> Missing
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {result.missing_concepts.length > 0
                                                    ? result.missing_concepts.map(c => <Badge key={c} variant="destructive" className="text-xs">{c}</Badge>)
                                                    : <span className="text-xs text-muted-foreground">All covered!</span>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="premium-hover-card bg-surface-elevated border-border/50">
                                    <CardContent className="pt-5">
                                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">AI Feedback</p>
                                        <p className="text-sm leading-relaxed">{result.feedback}</p>
                                    </CardContent>
                                </Card>

                                {result.tip && (
                                    <Card className="premium-hover-card border-amber/15 bg-amber/3">
                                        <CardContent className="flex gap-3 pt-5">
                                            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber" />
                                            <p className="text-sm">{result.tip}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                <Button className="w-full gap-2" onClick={reset}>
                                    <ChevronRight className="size-4" /> Next Question
                                </Button>
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Session History */}
            {log.length > 0 && (
                <motion.div {...fadeUp}>
                    <Card className="premium-hover-card">
                        <button
                            type="button"
                            className="flex w-full items-center gap-3 px-6 py-4 text-left"
                            onClick={() => setShowHistory(!showHistory)}
                        >
                            <Clock className="size-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Session History ({log.length})</span>
                            <ChevronDown className={`ml-auto size-4 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <Separator />
                                    <CardContent className="space-y-2 pt-4">
                                        {[...log].reverse().slice(0, 15).map(s => (
                                            <div key={s.id} className="flex items-center gap-4 rounded-lg bg-surface-elevated px-4 py-3">
                                                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                                                    s.score >= 70 ? 'bg-mint/10 text-mint' :
                                                    s.score >= 40 ? 'bg-amber/10 text-amber' : 'bg-crimson/10 text-crimson'
                                                }`}>
                                                    {s.score}%
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm">{s.questionPreview}…</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {s.difficulty} · {s.grade}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 gap-1.5">
                                                    <Badge className="bg-mint/10 text-mint text-xs">{s.conceptsCovered.length} covered</Badge>
                                                    {s.conceptsMissed.length > 0 && (
                                                        <Badge variant="destructive" className="text-xs">{s.conceptsMissed.length} missed</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </motion.div>
            )}
        </div>
    )
}
