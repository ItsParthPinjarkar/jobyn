import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Send, Clock, Target, ChevronRight, Trophy, AlertCircle,
    Lightbulb, BarChart3, Star, RefreshCw, Zap, CheckCircle2, XCircle
} from 'lucide-react'
import {
    startInterview, submitInterviewAnswer, endInterview,
    type InterviewQuestion, type InterviewEvaluation, type InterviewScorecard
} from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'

interface InterviewSimulatorProps {
    skill: string
    onComplete?: (scorecard: InterviewScorecard) => void
}

type Phase = 'setup' | 'answering' | 'evaluating' | 'feedback' | 'scorecard' | 'loading'

interface HistoryItem {
    question_number: number
    question: string
    answer: string
    score: number
    feedback: string
    key_points_covered: string[]
    key_points_missed: string[]
}

const DIFFICULTY_CONFIG = {
    easy: { label: 'Junior', color: 'text-success', bg: 'bg-success/10 border-success/20', desc: 'Fundamentals & definitions' },
    medium: { label: 'Mid-Level', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', desc: 'Practical scenarios & trade-offs' },
    hard: { label: 'Senior / FAANG', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', desc: 'System design & optimization' },
}

const MAX_QUESTIONS = 5
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export default function InterviewSimulator({ skill, onComplete }: InterviewSimulatorProps) {
    const [phase, setPhase] = useState<Phase>('setup')
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
    const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null)
    const [answer, setAnswer] = useState('')
    const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null)
    const [sessionHistory, setSessionHistory] = useState<HistoryItem[]>([])
    const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null)
    const [timer, setTimer] = useState(0)
    const [timerActive, setTimerActive] = useState(false)
    const [showHint, setShowHint] = useState(false)
    const [error, setError] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        if (timerActive) {
            timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
        } else if (timerRef.current) {
            clearInterval(timerRef.current)
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [timerActive])

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

    const handleStart = useCallback(async () => {
        setPhase('loading'); setError('')
        try {
            const q = await startInterview(skill, difficulty)
            setCurrentQuestion(q); setPhase('answering'); setTimer(0); setTimerActive(true); setShowHint(false)
            setTimeout(() => textareaRef.current?.focus(), 100)
        } catch { setError('Failed to start interview. Check your connection.'); setPhase('setup') }
    }, [skill, difficulty])

    const handleSubmitAnswer = useCallback(async () => {
        if (!answer.trim() || !currentQuestion) return
        setPhase('evaluating'); setTimerActive(false)
        try {
            const historyForApi = sessionHistory.map(h => ({ question: h.question, answer: h.answer, question_number: h.question_number, score: h.score }))
            const evalResult = await submitInterviewAnswer(skill, currentQuestion.question, answer, currentQuestion.question_number, difficulty, historyForApi)
            setEvaluation(evalResult)
            setSessionHistory(prev => [...prev, {
                question_number: currentQuestion.question_number, question: currentQuestion.question,
                answer, score: evalResult.score, feedback: evalResult.feedback,
                key_points_covered: evalResult.key_points_covered || [], key_points_missed: evalResult.key_points_missed || [],
            }])
            setPhase('feedback')
        } catch { setError('Failed to evaluate answer. Try again.'); setPhase('answering'); setTimerActive(true) }
    }, [answer, currentQuestion, difficulty, sessionHistory, skill])

    const handleEndInterview = useCallback(async () => {
        setPhase('loading'); setTimerActive(false)
        try {
            const historyForApi = sessionHistory.map(h => ({ question: h.question, answer: h.answer, question_number: h.question_number, score: h.score }))
            const card = await endInterview(skill, difficulty, historyForApi)
            setScorecard(card); setPhase('scorecard'); onComplete?.(card)
        } catch {
            const total = sessionHistory.reduce((s, h) => s + h.score, 0)
            const max = sessionHistory.length * 10
            const pct = max > 0 ? Math.round((total / max) * 100) : 0
            setScorecard({
                skill, difficulty, overall_score: total, max_score: max, percentage: pct,
                verdict: pct >= 70 ? 'HIRE' : 'LEAN_NO_HIRE',
                summary: `You scored ${pct}% across ${sessionHistory.length} questions.`,
                strengths: ['Completed the interview'], weaknesses: ['Review missed areas'],
                recommendations: [`Practice more ${skill}`], skill_breakdown: {},
                interview_ready: pct >= 70, suggested_next_topics: [skill], questions_answered: sessionHistory.length,
            })
            setPhase('scorecard')
        }
    }, [skill, difficulty, sessionHistory, onComplete])

    const handleNextQuestion = useCallback(() => {
        if (!evaluation?.follow_up_question) return
        if (sessionHistory.length >= MAX_QUESTIONS) { handleEndInterview(); return }
        setCurrentQuestion(evaluation.follow_up_question); setAnswer(''); setEvaluation(null); setShowHint(false)
        setPhase('answering'); setTimer(0); setTimerActive(true)
        setTimeout(() => textareaRef.current?.focus(), 100)
    }, [evaluation, sessionHistory.length, handleEndInterview])

    const handleRestart = () => {
        setPhase('setup'); setCurrentQuestion(null); setAnswer(''); setEvaluation(null)
        setSessionHistory([]); setScorecard(null); setTimer(0); setError('')
    }

    const avgScore = sessionHistory.length > 0 ? Math.round(sessionHistory.reduce((s, h) => s + h.score, 0) / sessionHistory.length * 10) / 10 : 0

    // ── SETUP ──
    if (phase === 'setup') return (
        <motion.div {...fadeUp} className="space-y-6">
            <div className="text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10"><Target className="size-7 text-primary" /></div>
                <h2 className="font-heading text-xl font-bold">Mock Interview: {skill}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Practice with an AI interviewer that adapts to your level. Get real-time feedback and a comprehensive scorecard.</p>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Difficulty</p>
                <div className="grid gap-2 sm:grid-cols-3">
                    {(Object.entries(DIFFICULTY_CONFIG) as [keyof typeof DIFFICULTY_CONFIG, typeof DIFFICULTY_CONFIG[keyof typeof DIFFICULTY_CONFIG]][]).map(([key, cfg]) => (
                        <button type="button" key={key}
                            className={`rounded-lg border-2 p-3 text-left transition-all ${difficulty === key ? cfg.bg + ' border-current ' + cfg.color : 'border-border hover:border-muted-foreground/30'}`}
                            onClick={() => setDifficulty(key)}
                        >
                            <p className={`text-sm font-semibold ${difficulty === key ? cfg.color : ''}`}>{cfg.label}</p>
                            <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Zap className="size-3.5" /> {MAX_QUESTIONS} adaptive questions</span>
                <span className="flex items-center gap-1.5"><Clock className="size-3.5" /> ~10-15 minutes</span>
                <span className="flex items-center gap-1.5"><BarChart3 className="size-3.5" /> Detailed scorecard</span>
            </div>

            {error && <p className="flex items-center justify-center gap-1.5 text-xs text-destructive"><AlertCircle className="size-3" /> {error}</p>}

            <div className="text-center">
                <Button size="lg" className="gap-2" onClick={handleStart}><Target className="size-4" /> Begin Interview</Button>
            </div>
        </motion.div>
    )

    // ── LOADING / EVALUATING ──
    if (phase === 'loading' || phase === 'evaluating') return (
        <motion.div {...fadeUp} className="flex flex-col items-center gap-3 py-12">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <h3 className="font-heading text-sm font-semibold">{phase === 'loading' ? 'AI Interviewer is thinking…' : 'Evaluating your answer…'}</h3>
            <p className="text-xs text-muted-foreground">{phase === 'loading' ? 'Preparing your next challenge' : 'The interviewer is reviewing your response'}</p>
        </motion.div>
    )

    // ── ANSWERING ──
    if (phase === 'answering' && currentQuestion) return (
        <motion.div {...fadeUp} className="space-y-4">
            {/* Status bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">Q{currentQuestion.question_number}/{MAX_QUESTIONS}</Badge>
                    <Badge variant="secondary" className="text-xs">{currentQuestion.category}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    {sessionHistory.length > 0 && <span className="font-medium text-muted-foreground">Avg: {avgScore}/10</span>}
                    <span className={`flex items-center gap-1 font-mono ${timer > (currentQuestion.time_estimate_seconds || 120) ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <Clock className="size-3" /> {formatTime(timer)}
                    </span>
                </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-2">
                {Array.from({ length: MAX_QUESTIONS }, (_, i) => (
                    <div key={i} className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                        i < sessionHistory.length ? 'bg-primary/20 text-primary'
                            : i === sessionHistory.length ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                            : 'bg-muted text-muted-foreground'
                    }`}>
                        {i < sessionHistory.length ? sessionHistory[i].score : i + 1}
                    </div>
                ))}
            </div>

            {/* Question */}
            <Card>
                <CardContent className="flex gap-3 pt-6">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Target className="size-4 text-primary" /></div>
                    <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm leading-relaxed">{currentQuestion.question}</p>
                        {!showHint ? (
                            <button type="button" className="flex items-center gap-1.5 text-xs text-amber-500 hover:underline" onClick={() => setShowHint(true)}>
                                <Lightbulb className="size-3" /> Need a hint?
                            </button>
                        ) : (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
                                <p className="flex items-start gap-1.5 text-xs"><Lightbulb className="mt-0.5 size-3 shrink-0 text-amber-500" /> {currentQuestion.hint}</p>
                            </motion.div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Answer area */}
            <Textarea ref={textareaRef} value={answer} onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer here... Be thorough and specific." className="min-h-[140px] resize-y"
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmitAnswer() }}
            />

            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{answer.split(/\s+/).filter(Boolean).length} words</span>
                <div className="flex items-center gap-2">
                    {sessionHistory.length >= 1 && (
                        <Button variant="ghost" size="sm" onClick={handleEndInterview}>End Interview</Button>
                    )}
                    <Button onClick={handleSubmitAnswer} disabled={!answer.trim()} className="gap-2">
                        <Send className="size-3.5" /> Submit Answer
                        <kbd className="pointer-events-none ml-1 rounded border bg-primary-foreground/10 px-1 py-0.5 text-xs font-mono text-primary-foreground/70">Ctrl+Enter</kbd>
                    </Button>
                </div>
            </div>
        </motion.div>
    )

    // ── FEEDBACK ──
    if (phase === 'feedback' && evaluation) {
        const scoreColor = evaluation.score >= 8 ? 'text-success' : evaluation.score >= 6 ? 'text-amber-500' : 'text-destructive'
        const scoreRingColor = evaluation.score >= 8 ? 'stroke-success' : evaluation.score >= 6 ? 'stroke-amber-500' : 'stroke-destructive'
        return (
            <motion.div {...fadeUp} className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                    <div className="relative size-20">
                        <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                            <circle cx="40" cy="40" r="34" fill="none" strokeWidth="5" strokeLinecap="round"
                                className={scoreRingColor}
                                strokeDasharray={`${(evaluation.score / 10) * 214} 214`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`font-heading text-2xl font-bold ${scoreColor}`}>{evaluation.score}</span>
                            <span className="text-xs text-muted-foreground">/10</span>
                        </div>
                    </div>
                    {evaluation.interviewer_note && <p className="text-center text-xs italic text-muted-foreground">"{evaluation.interviewer_note}"</p>}
                </div>

                <p className="text-sm leading-relaxed">{evaluation.feedback}</p>

                <div className="grid gap-3 sm:grid-cols-2">
                    {evaluation.key_points_covered.length > 0 && (
                        <div className="rounded-lg border p-3">
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-success"><CheckCircle2 className="size-3" /> Points Covered</p>
                            <ul className="space-y-1">{evaluation.key_points_covered.map((p, i) => <li key={i} className="text-xs text-muted-foreground">{p}</li>)}</ul>
                        </div>
                    )}
                    {evaluation.key_points_missed.length > 0 && (
                        <div className="rounded-lg border p-3">
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-destructive"><XCircle className="size-3" /> Points Missed</p>
                            <ul className="space-y-1">{evaluation.key_points_missed.map((p, i) => <li key={i} className="text-xs text-muted-foreground">{p}</li>)}</ul>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {sessionHistory.length < MAX_QUESTIONS ? (
                        <Button onClick={handleNextQuestion} className="gap-2">Next Question <ChevronRight className="size-4" /></Button>
                    ) : (
                        <Button onClick={handleEndInterview} className="gap-2"><Trophy className="size-4" /> View Scorecard</Button>
                    )}
                    {sessionHistory.length >= 2 && sessionHistory.length < MAX_QUESTIONS && (
                        <Button variant="ghost" onClick={handleEndInterview}>End Early & Get Scorecard</Button>
                    )}
                </div>
            </motion.div>
        )
    }

    // ── SCORECARD ──
    if (phase === 'scorecard' && scorecard) {
        const verdictConfig: Record<string, { color: string; label: string }> = {
            STRONG_HIRE: { color: 'text-success', label: 'Strong Hire' },
            HIRE: { color: 'text-success', label: 'Hire' },
            LEAN_HIRE: { color: 'text-amber-500', label: 'Lean Hire' },
            LEAN_NO_HIRE: { color: 'text-orange-500', label: 'Lean No Hire' },
            NO_HIRE: { color: 'text-destructive', label: 'No Hire' },
        }
        const v = verdictConfig[scorecard.verdict] || verdictConfig.LEAN_HIRE

        return (
            <motion.div {...fadeUp} className="space-y-6">
                <div className="text-center">
                    <h2 className={`font-heading text-2xl font-bold ${v.color}`}>{v.label}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{scorecard.summary}</p>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {[
                        { value: `${scorecard.percentage}%`, label: 'Overall Score', color: v.color },
                        { value: String(scorecard.questions_answered), label: 'Questions', color: '' },
                        { value: `${scorecard.overall_score}/${scorecard.max_score}`, label: 'Points', color: '' },
                        { value: scorecard.interview_ready ? 'Ready' : 'Not Yet', label: 'Interview Ready', color: scorecard.interview_ready ? 'text-success' : 'text-muted-foreground' },
                    ].map(s => (
                        <Card key={s.label} className="text-center">
                            <CardContent className="py-3">
                                <p className={`font-heading text-xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {scorecard.skill_breakdown && Object.keys(scorecard.skill_breakdown).length > 0 && (
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="size-4" /> Skill Breakdown</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(scorecard.skill_breakdown).map(([key, val]) => (
                                <div key={key} className="flex items-center gap-3">
                                    <span className="w-28 shrink-0 text-xs capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                                    <Progress value={(val as number / 10) * 100} className="h-2 flex-1" />
                                    <span className="w-8 text-right font-mono text-xs font-semibold">{val as number}/10</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                    {scorecard.strengths.length > 0 && (
                        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Star className="size-4 text-amber-500" /> Strengths</CardTitle></CardHeader>
                            <CardContent><ul className="space-y-1">{scorecard.strengths.map((s, i) => <li key={i} className="text-xs text-muted-foreground">{s}</li>)}</ul></CardContent></Card>
                    )}
                    {scorecard.weaknesses.length > 0 && (
                        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertCircle className="size-4 text-destructive" /> Areas to Improve</CardTitle></CardHeader>
                            <CardContent><ul className="space-y-1">{scorecard.weaknesses.map((w, i) => <li key={i} className="text-xs text-muted-foreground">{w}</li>)}</ul></CardContent></Card>
                    )}
                </div>

                {scorecard.recommendations.length > 0 && (
                    <Card className="border-amber-500/20"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Lightbulb className="size-4 text-amber-500" /> Recommendations</CardTitle></CardHeader>
                        <CardContent><ul className="space-y-1">{scorecard.recommendations.map((r, i) => <li key={i} className="text-xs text-muted-foreground">{r}</li>)}</ul></CardContent></Card>
                )}

                {sessionHistory.length > 0 && (
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Interview Transcript</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {sessionHistory.map((h, i) => (
                                <div key={i} className="rounded-lg border p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <Badge variant="outline" className="text-xs">Q{h.question_number}</Badge>
                                        <span className={`font-mono text-sm font-bold ${h.score >= 7 ? 'text-success' : h.score >= 5 ? 'text-amber-500' : 'text-destructive'}`}>{h.score}/10</span>
                                    </div>
                                    <p className="mb-1 text-xs font-medium">{h.question}</p>
                                    <p className="text-xs text-muted-foreground">{h.answer}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <div className="text-center">
                    <Button onClick={handleRestart} className="gap-2"><RefreshCw className="size-4" /> Practice Again</Button>
                </div>
            </motion.div>
        )
    }

    return null
}
