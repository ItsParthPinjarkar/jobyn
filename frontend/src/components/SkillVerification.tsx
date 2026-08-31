import { useState } from 'react'
import { Loader2, ShieldCheck, Lock, Sparkles, ArrowRight, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    startAssessment, submitAssessment,
    type AssessmentQuestion, type AssessmentResult,
} from '../api/client'

interface Props {
    open: boolean
    onClose: () => void
    role: string
    skills: string[]
    rawText: string
    sections: string[]
    /** Called with the new (unlocked) score when verification succeeds. */
    onUnlocked?: (newScore: number) => void
}

type Phase = 'intro' | 'loading' | 'quiz' | 'result' | 'error'

/**
 * Opt-in skill verification. Quizzes the user's unverified, role-critical
 * skills and unlocks the score headroom for the ones they pass. Failing a skill
 * never lowers the score — it just isn't unlocked.
 */
export default function SkillVerification({ open, onClose, role, skills, rawText, sections, onUnlocked }: Props) {
    const [phase, setPhase] = useState<Phase>('intro')
    const [token, setToken] = useState<string | null>(null)
    const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [idx, setIdx] = useState(0)
    const [result, setResult] = useState<AssessmentResult | null>(null)
    const [error, setError] = useState('')

    const reset = () => { setPhase('intro'); setToken(null); setQuestions([]); setAnswers({}); setIdx(0); setResult(null); setError('') }
    const close = () => { reset(); onClose() }

    const begin = async () => {
        setPhase('loading')
        try {
            const r = await startAssessment(role, skills, rawText, sections)
            if (!r.token || r.questions.length === 0) {
                setError(r.message || 'Your skills are already well-evidenced — nothing to verify.')
                setPhase('error'); return
            }
            setToken(r.token); setQuestions(r.questions); setIdx(0); setPhase('quiz')
        } catch {
            setError('Could not start the skill check. Please try again.'); setPhase('error')
        }
    }

    const submit = async (finalAnswers: Record<string, number>) => {
        if (!token) return
        setPhase('loading')
        try {
            const r = await submitAssessment(token, finalAnswers)
            setResult(r); setPhase('result')
            if (r.new_score) onUnlocked?.(r.new_score)
        } catch {
            setError('Could not submit your answers. Please try again.'); setPhase('error')
        }
    }

    const choose = (qid: string, i: number) => {
        const next = { ...answers, [qid]: i }
        setAnswers(next)
        if (idx < questions.length - 1) setIdx(idx + 1)
        else submit(next)
    }

    const q = questions[idx]

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) close() }}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogTitle className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" /> Verify your skills
                </DialogTitle>

                {phase === 'intro' && (
                    <div className="space-y-4 py-2 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                            <Lock className="size-6 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            A few of your listed skills aren’t verified yet. Answer a short, role-targeted
                            quiz to confirm them and <strong className="text-foreground">unlock the held-back points</strong>.
                            Getting one wrong never lowers your score.
                        </p>
                        <Button className="w-full gap-2" onClick={begin}>
                            <Sparkles className="size-4" /> Start 60-second check
                        </Button>
                    </div>
                )}

                {phase === 'loading' && (
                    <div className="flex flex-col items-center gap-3 py-12">
                        <Loader2 className="size-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Preparing your questions…</p>
                    </div>
                )}

                {phase === 'quiz' && q && (
                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Question {idx + 1} of {questions.length}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 font-medium capitalize">{q.skill}</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary transition-all" style={{ width: `${((idx) / questions.length) * 100}%` }} />
                        </div>
                        <p className="font-medium">{q.question}</p>
                        <div className="flex flex-col gap-2">
                            {q.options.map((opt, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => choose(q.id, i)}
                                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5"
                                >
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className="min-w-0">{opt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {phase === 'result' && result && (
                    <div className="space-y-4 py-2 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/10">
                            <ShieldCheck className="size-7 text-success" />
                        </div>
                        {result.unlocked_points > 0 ? (
                            <>
                                <h3 className="font-heading text-lg font-bold">
                                    +{result.unlocked_points} points unlocked!
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Your score is now <strong className="text-foreground">{result.new_score}</strong>
                                    {result.remaining_headroom > 0 && <> — {result.remaining_headroom} more still available.</>}
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="font-heading text-lg font-bold">Skill check complete</h3>
                                <p className="text-sm text-muted-foreground">
                                    No points unlocked this time — the skills you missed have been added to your learning path.
                                </p>
                            </>
                        )}
                        {result.passed_skills.length > 0 && (
                            <p className="text-xs text-success">Verified: {result.passed_skills.join(', ')}</p>
                        )}
                        {result.failed_skills.length > 0 && (
                            <p className="text-xs text-muted-foreground">To review: {result.failed_skills.join(', ')}</p>
                        )}
                        <Button className="w-full gap-2" onClick={close}>
                            Done <ArrowRight className="size-4" />
                        </Button>
                    </div>
                )}

                {phase === 'error' && (
                    <div className="space-y-4 py-6 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
                            <X className="size-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <Button variant="outline" className="w-full" onClick={close}>Close</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
