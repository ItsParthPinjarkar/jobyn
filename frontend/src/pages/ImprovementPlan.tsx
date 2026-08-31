import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    getMarketForecast, getSmartPlan,
    type ForecastResult, type SmartPlanResult, type SmartPlanItem,
} from '../api/client'
import { useResume } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'
import { markChecklistItem } from '../utils/onboardingChecklist'
import {
    Clock, Lock, PlayCircle, Trophy, Blocks,
    Target, CalendarClock, TrendingUp, ChevronDown, ChevronUp,
    GitBranch, ExternalLink, Shield, Sparkles, ShieldCheck,
} from 'lucide-react'
import AuthRequiredPrompt from '../components/AuthRequiredPrompt'
import SkillVerification from '../components/SkillVerification'
import StudyHub from '../components/StudyHub'
import ProjectGeneratorModal from '../components/ProjectGeneratorModal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export default function ImprovementPlan() {
    const { analysis, masteredSkills, dailyCommitment, setDailyCommitment, markSkillMastered } = useResume()
    const { user } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const highlightSkill = (location.state as { highlightSkill?: string } | null)?.highlightSkill

    const role = analysis?.role ?? 'Software Developer'
    const missingCore = analysis?.missing_core_skills ?? []
    const missingOpt = analysis?.missing_optional_skills ?? []

    const [smartPlan, setSmartPlan] = useState<SmartPlanResult | null>(null)
    const [planLoading, setPlanLoading] = useState(false)
    const [planError, setPlanError] = useState<string | null>(null)
    const [deadline, setDeadline] = useState<string>('')
    const [deadlineOpen, setDeadlineOpen] = useState(false)
    const [activeStudy, setActiveStudy] = useState<string | null>(null)
    const [activeProject, setActiveProject] = useState<{ role: string; skills: string[] } | null>(null)
    const [aiForecast, setAiForecast] = useState<ForecastResult | null>(null)
    const [forecastLoading, setForecastLoading] = useState(false)
    const [forecastError, setForecastError] = useState<string | null>(null)
    const [forecastExpanded, setForecastExpanded] = useState(false)
    const [verifyOpen, setVerifyOpen] = useState(false)
    const [verifiedDone, setVerifiedDone] = useState(false)
    const unverifiedClaimed = (analysis?.skill_proficiency ?? []).filter(p => p.verifiable).map(p => p.skill)

    useEffect(() => {
        if (!analysis) return
        setPlanLoading(true); setPlanError(null)
        getSmartPlan(missingCore, missingOpt, masteredSkills, dailyCommitment, deadline || undefined)
            .then(setSmartPlan)
            .catch(err => setPlanError(err?.message || 'Failed to build learning plan'))
            .finally(() => setPlanLoading(false))
    }, [analysis, dailyCommitment, deadline, masteredSkills.length]) // eslint-disable-line

    useEffect(() => {
        if (!analysis) return
        const today = new Date().toISOString().slice(0, 10)
        const cacheKey = `forecast_${role}_${today}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) { try { setAiForecast(JSON.parse(cached)); return } catch { /* */ } }
        setForecastLoading(true); setForecastError(null)
        getMarketForecast(role, missingCore)
            .then(data => {
                setAiForecast(data)
                try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch { /* */ }
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i)
                    if (k && k.startsWith('forecast_') && !k.includes(today)) localStorage.removeItem(k)
                }
            })
            .catch(err => setForecastError(err?.message || 'Failed to load market forecast'))
            .finally(() => setForecastLoading(false))
    }, [role, analysis]) // eslint-disable-line

    const planItems = smartPlan?.schedule ?? []
    const totalMastered = planItems.filter(p => masteredSkills.includes(p.skill.toLowerCase())).length

    const dayGroups = planItems.reduce<Record<number, SmartPlanItem[]>>((acc, item) => {
        (acc[item.scheduled_day] ??= []).push(item)
        return acc
    }, {})

    const canStudy = (item: SmartPlanItem) => item.prerequisites.every(p => masteredSkills.includes(p.toLowerCase()))

    const handleVerified = (skill: string) => {
        markSkillMastered(skill.toLowerCase())
        markChecklistItem('started_learning', user?.email)
    }

    if (!user) {
        return <AuthRequiredPrompt feature="Learning Roadmap" />
    }

    if (!analysis) {
        return (
            <div className="mx-auto max-w-xl py-20 text-center">
                <motion.div {...fadeUp}>
                    <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-muted">
                        <Sparkles className="size-10 text-muted-foreground" />
                    </div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight">No Roadmap Available</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Your personalized learning path will be generated once you upload and analyze your resume.</p>
                    <Button className="mt-6 gap-2" onClick={() => navigate('/resume-analyzer')}>
                        <Sparkles className="size-4" /> Analyze Your Resume Now
                    </Button>
                    <Card className="premium-hover-card mt-10 text-left">
                        <CardContent className="pt-6">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">What's Inside?</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>Smart dependency-aware learning path (powered by skill graph)</li>
                                <li>Career milestone tracking</li>
                                <li>Deadline mode — set your interview date, we adjust the plan</li>
                                <li>AI Market Forecast with growth insights</li>
                                <li>Integrated Study Hub + Project Verification</li>
                            </ul>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            {/* Career Progress Banner */}
            <motion.div {...fadeUp}>
                <Card className="premium-hover-card border-primary/10 bg-gradient-to-r from-primary/5 to-violet/5">
                    <CardContent className="flex items-center gap-6 pt-6">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Trophy className="size-6 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{totalMastered} skill{totalMastered !== 1 && 's'} mastered</p>
                            <p className="text-xs text-muted-foreground">Complete your learning path to reach career readiness</p>
                        </div>
                        <div className="text-right">
                            <p className="font-heading text-2xl font-bold text-primary">{planItems.length > 0 ? Math.round((totalMastered / planItems.length) * 100) : 0}%</p>
                            <p className="text-xs text-muted-foreground">Progress</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Confirm claimed-but-unverified skills before building the plan around them */}
            {unverifiedClaimed.length > 0 && !verifiedDone && (
                <motion.div {...fadeUp} transition={{ delay: 0.04 }}>
                    <Card className="border-warning/20 bg-warning/5">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div className="flex items-center gap-2 text-sm">
                                <ShieldCheck className="size-4 shrink-0 text-warning" />
                                <span>
                                    <strong>{unverifiedClaimed.length} skill{unverifiedClaimed.length > 1 ? 's' : ''}</strong> on your resume aren’t verified — confirm them so your plan reflects your real level.
                                </span>
                            </div>
                            <Button size="sm" variant="outline" className="gap-1.5 border-warning/40" onClick={() => setVerifyOpen(true)}>
                                <ShieldCheck className="size-4" /> Verify skills
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Header + Controls */}
            <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="font-heading text-2xl font-bold tracking-tight">Adaptive Learning Path</h1>
                        <p className="text-sm text-muted-foreground">Smart dependency-aware {role} roadmap</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5">
                            <Clock className="size-3.5 text-primary" />
                            <select value={dailyCommitment} onChange={e => setDailyCommitment(Number(e.target.value))} className="bg-transparent text-xs font-medium outline-none">
                                <option value={1}>1h / day</option>
                                <option value={2}>2h / day</option>
                                <option value={4}>4h / day</option>
                                <option value={8}>Full-time</option>
                            </select>
                        </div>
                        <Button variant={deadline ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setDeadlineOpen(!deadlineOpen)}>
                            <CalendarClock className="size-3.5" />
                            {deadline ? `Deadline: ${new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Set Deadline'}
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Deadline picker */}
            <AnimatePresence>
                {deadlineOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <Card className="premium-hover-card border-destructive/15 bg-destructive/5">
                            <CardContent className="flex flex-wrap items-center gap-4 pt-6">
                                <CalendarClock className="size-5 text-destructive" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold">Deadline Mode</p>
                                    <p className="text-xs text-muted-foreground">Set your interview or job application date — we'll auto-adjust daily study hours.</p>
                                </div>
                                <input type="date" value={deadline} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} onChange={e => setDeadline(e.target.value)} className="rounded-md border bg-background px-3 py-1.5 text-sm" />
                                {deadline && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setDeadline(''); setDeadlineOpen(false) }}>Clear</Button>}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Deadline insights */}
            {smartPlan?.deadline && smartPlan.days_available && (
                <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
                    <Card className={`premium-hover-card ${smartPlan.recommended_daily_hours > smartPlan.daily_hours ? 'border-destructive/20 bg-destructive/5' : 'border-success/20 bg-success/5'}`}>
                        <CardContent className="flex items-center gap-3 pt-6">
                            <Target className="size-4 shrink-0" style={{ color: smartPlan.recommended_daily_hours > smartPlan.daily_hours ? 'var(--destructive)' : 'var(--success)' }} />
                            <p className="text-sm">
                                <strong>{smartPlan.days_available} days</strong> until deadline.
                                {smartPlan.recommended_daily_hours > smartPlan.daily_hours ? (
                                    <> You need <strong className="text-destructive">{smartPlan.recommended_daily_hours}h/day</strong> to finish on time (currently {smartPlan.daily_hours}h).</>
                                ) : (
                                    <> At {smartPlan.daily_hours}h/day you'll finish in <strong className="text-success">{smartPlan.total_days} days</strong> — comfortably on time!</>
                                )}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* AI Market Forecast */}
            {forecastLoading && (
                <Card className="premium-hover-card"><CardContent className="flex items-center justify-center gap-3 py-8">
                    <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm text-muted-foreground">Loading market forecast…</span>
                </CardContent></Card>
            )}
            {forecastError && !forecastLoading && (
                <Card className="premium-hover-card border-destructive/20 bg-destructive/5"><CardContent className="py-4 text-sm text-destructive">{forecastError}</CardContent></Card>
            )}
            {aiForecast && !forecastLoading && (
                <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                    <Card className="premium-hover-card cursor-pointer border-success/20" onClick={() => setForecastExpanded(!forecastExpanded)}>
                        <CardContent className="flex items-center gap-4 pt-6">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-lg">📈</div>
                            <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-success/10 text-success text-xs">AI MARKET FORECAST</Badge>
                                    <span className="text-xs font-bold text-success">{aiForecast.growth_pct != null ? `+${aiForecast.growth_pct}% Opportunity` : 'Analyzing...'}</span>
                                    {aiForecast.demand_level && aiForecast.demand_level !== 'N/A' && (
                                        <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">{aiForecast.demand_level} Demand</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">{aiForecast.summary}</p>
                                {aiForecast.median_salary_inr && aiForecast.median_salary_inr !== 'N/A' && (
                                    <p className="mt-1 text-xs font-medium text-foreground">Median Salary: {aiForecast.median_salary_inr}</p>
                                )}
                            </div>
                            {forecastExpanded ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
                        </CardContent>
                        <AnimatePresence>
                            {forecastExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <Separator />
                                    <CardContent className="space-y-3 pt-4">
                                        {aiForecast.top_companies && aiForecast.top_companies.length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Top Hiring Companies</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {aiForecast.top_companies.map((c, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {aiForecast.sources?.length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Verification Sources</p>
                                                {aiForecast.sources.map((src, i) => (
                                                    <div key={i} className="flex items-start gap-3 rounded-lg border border-success/10 bg-success/5 p-3 mb-2">
                                                        <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-success" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold">{src.name}</p>
                                                            <p className="text-xs text-muted-foreground">{src.insight}</p>
                                                            {src.url && <a href={src.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="size-3" /> View Source</a>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </motion.div>
            )}

            {/* Plan Summary */}
            {smartPlan && (
                <motion.div {...fadeUp} transition={{ delay: 0.12 }}>
                    <div className="grid grid-cols-5 gap-3">
                        {[
                            { value: smartPlan.total_skills, label: 'Total Skills', color: 'text-primary' },
                            { value: smartPlan.prerequisite_skills, label: 'Prerequisites', color: 'text-amber-500' },
                            { value: smartPlan.target_skills, label: 'Target Skills', color: 'text-success' },
                            { value: smartPlan.total_days, label: 'Days', color: '' },
                            { value: `${smartPlan.total_hours}h`, label: 'Study Time', color: '' },
                        ].map(s => (
                            <Card key={s.label} className="premium-hover-card text-center"><CardContent className="py-3">
                                <p className={`font-heading text-xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                            </CardContent></Card>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Plan Loading / Error */}
            {planLoading && (
                <Card className="premium-hover-card"><CardContent className="flex flex-col items-center gap-3 py-10">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Building your dependency-aware learning plan…</p>
                </CardContent></Card>
            )}
            {planError && !planLoading && (
                <Card className="premium-hover-card border-destructive/20 bg-destructive/5"><CardContent className="py-4 text-sm text-destructive">{planError}</CardContent></Card>
            )}

            {/* Roadmap */}
            {!planLoading && smartPlan && (
                <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
                    <div className="space-y-8">
                        {Object.entries(dayGroups).map(([dayStr, tasks]) => {
                            const day = Number(dayStr)
                            return (
                                <div key={day} className="relative pl-8">
                                    <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                                    <div className="absolute left-0 top-1 flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-2 ring-background">D{day}</div>
                                    <div className="mb-3 flex items-center gap-3">
                                        <h3 className="font-heading text-base font-semibold">Day {day}</h3>
                                        <span className="text-xs text-muted-foreground">{tasks.reduce((acc, t) => acc + t.duration_minutes, 0)} mins</span>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {tasks.map(task => {
                                            const isMastered = masteredSkills.includes(task.skill.toLowerCase())
                                            const isLocked = !canStudy(task) && !isMastered
                                            return (
                                                <motion.div key={task.id} layout>
                                                    <Card className={`premium-hover-card relative transition-all ${isLocked ? 'opacity-50' : ''} ${isMastered ? 'border-success/30 bg-success/5' : ''} ${highlightSkill?.toLowerCase() === task.skill ? 'ring-2 ring-primary' : ''}`}>
                                                        <CardContent className="pt-5">
                                                            <div className="mb-3 flex items-center justify-between">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <Badge variant={task.difficulty === 'Advanced' ? 'destructive' : task.difficulty === 'Intermediate' ? 'default' : 'secondary'} className="text-xs">{task.difficulty}</Badge>
                                                                    {task.is_prerequisite && !task.is_target_skill && <Badge variant="secondary" className="bg-violet-500/10 text-violet-500 text-xs">PREREQUISITE</Badge>}
                                                                    {task.is_target_skill && <Badge variant="secondary" className="bg-primary/10 text-primary text-xs"><Target className="mr-1 size-2.5" /> TARGET</Badge>}
                                                                </div>
                                                                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" /> {task.duration_minutes}m</span>
                                                            </div>
                                                            <h4 className="mb-2 text-sm font-semibold">{task.title}</h4>
                                                            {(task.prerequisites.length > 0 || task.unlocks.length > 0) && (
                                                                <div className="mb-3 space-y-1.5">
                                                                    {task.prerequisites.length > 0 && (
                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                            <Shield className="size-3 text-muted-foreground" />
                                                                            <span className="text-xs text-muted-foreground">Requires:</span>
                                                                            {task.prerequisites.map(p => {
                                                                                const met = masteredSkills.includes(p.toLowerCase())
                                                                                return <Badge key={p} variant="secondary" className={`text-xs ${met ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{met ? '✓' : '○'} {p}</Badge>
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                    {task.unlocks.length > 0 && (
                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                            <GitBranch className="size-3 text-primary" />
                                                                            <span className="text-xs text-muted-foreground">Unlocks:</span>
                                                                            {task.unlocks.map(u => <Badge key={u} variant="secondary" className="bg-primary/10 text-primary text-xs">{u}</Badge>)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {isLocked ? (
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium"><Lock className="size-3.5" /> Complete prerequisites first</div>
                                                            ) : isMastered ? (
                                                                <div className="flex items-center gap-2 text-sm font-bold text-success"><Trophy className="size-4" /> Verified Mastery</div>
                                                            ) : (
                                                                <div className="flex flex-col gap-2">
                                                                    <Button size="sm" className="w-full justify-center gap-2" onClick={() => setActiveStudy(task.skill)}><PlayCircle className="size-4" /> Start AI Study Hub</Button>
                                                                    <Button variant="outline" size="sm" className="w-full justify-center gap-2" onClick={() => setActiveProject({ role, skills: [task.skill] })}><Blocks className="size-4" /> Generate Project</Button>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            )}

            {activeStudy && <StudyHub skill={activeStudy} onClose={() => setActiveStudy(null)} onVerified={s => handleVerified(s)} />}
            {activeProject && <ProjectGeneratorModal role={activeProject.role} skills={activeProject.skills} onClose={() => setActiveProject(null)} />}
            {analysis && (
                <SkillVerification
                    open={verifyOpen}
                    onClose={() => setVerifyOpen(false)}
                    role={role}
                    skills={analysis.detected_skills}
                    rawText={analysis.raw_text}
                    sections={analysis.sections_detected}
                    onUnlocked={() => setVerifiedDone(true)}
                />
            )}
        </div>
    )
}
