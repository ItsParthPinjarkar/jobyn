import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useResume } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'
import { getAnalytics, getBenchmarks, type BenchmarkData } from '../api/client'
import { loadHistory, getHistoryOrDemo } from '../utils/history'
import MilestoneCard from '../components/MilestoneCard'
import OnboardingNudge from '../components/OnboardingNudge'
import { Upload, AlertCircle, Lightbulb, Activity, TrendingUp, Trophy, ArrowRight, BarChart2, Zap, BookOpen, Target, CheckCircle, Share2, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
}

function PeerBenchmarkCard({ role, score }: { role: string; score: number }) {
  const [data, setData] = useState<BenchmarkData | null>(null)
  useEffect(() => {
    getBenchmarks(role).then(setData).catch(() => {})
  }, [role])

  if (!data || data.total_analyses < 5) return null

  const pct = data.user_percentile ?? 50
  const topPct = Math.max(1, 100 - pct)

  return (
    <Card className="premium-hover-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-accent/10 p-1.5">
            <Users className="size-4 text-accent" />
          </div>
          <div>
            <CardTitle className="text-base">Peer Ranking</CardTitle>
            <CardDescription>Based on {data.total_analyses} analyses</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-3">
          <span className="text-3xl font-heading font-bold text-accent">Top {topPct}%</span>
          <p className="text-sm text-muted-foreground mt-1">of {role} candidates</p>
        </div>
        <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-2">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 size-4 bg-white border-2 border-accent rounded-full shadow" style={{ left: `calc(${pct}% - 8px)` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Bottom</span>
          <span>Top</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { analysis, prediction, bestFit, masteredSkills, completedTasks, loading } = useResume()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<any>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null)

  useEffect(() => {
    const ctl = new AbortController()
    getAnalytics()
      .then(d => { if (!ctl.signal.aborted) setAnalytics(d) })
      .catch(err => { if (!ctl.signal.aborted) setAnalyticsError(err?.message || 'Failed to load analytics') })
    return () => ctl.abort()
  }, [])

  useEffect(() => {
    if (!analysis?.role) return
    const ctl = new AbortController()
    getBenchmarks(analysis.role)
      .then(d => { if (!ctl.signal.aborted) setBenchmark(d) })
      .catch(() => {})
    return () => ctl.abort()
  }, [analysis?.role])

  const chartHistory = useMemo(() => getHistoryOrDemo(loadHistory(user?.email)), [user?.email])
  // Provisional (confidence-discounted) score, for consistency with the analyzer.
  const score = analysis?.provisional_score ?? analysis?.final_score ?? 0
  const readiness = analysis?.readiness_category ?? 'Unknown'
  const masteredLower = useMemo(() => new Set(masteredSkills.map(s => s.toLowerCase())), [masteredSkills])
  const skills = useMemo(() => {
    const base = analysis?.detected_skills ?? []
    const extra = masteredSkills.filter(s => !base.some(b => b.toLowerCase() === s.toLowerCase()))
    return [...base, ...extra]
  }, [analysis, masteredSkills])
  const missingCore = useMemo(() => (analysis?.missing_core_skills ?? []).filter(s => !masteredLower.has(s.toLowerCase())), [analysis, masteredLower])
  const missingOpt = useMemo(() => (analysis?.missing_optional_skills ?? []).filter(s => !masteredLower.has(s.toLowerCase())), [analysis, masteredLower])
  const missingCount = missingCore.length + missingOpt.length
  const isFirstTime = !analysis && !loading
  const originalCorePct = analysis?.core_coverage_percent ?? 0
  const totalCoreSkills = (analysis?.detected_skills?.length ?? 0) + (analysis?.missing_core_skills?.length ?? 0)
  const newlyMasteredCore = (analysis?.missing_core_skills ?? []).filter(s => masteredLower.has(s.toLowerCase())).length
  const corePct = analysis ? Math.min(100, Math.round(originalCorePct + (totalCoreSkills > 0 ? (newlyMasteredCore / totalCoreSkills) * 100 : 0))) : 0

  const { SKILL_COVERAGE, TOP_MISSING } = useMemo(() => {
    const skillsLower = new Set(skills.map(x => x.toLowerCase()))
    const hasSkill = (list: string[]) => list.filter(s => skillsLower.has(s)).length
    const coverage = [
      { label: 'Programming Languages', pct: analysis ? Math.min(100, Math.round(hasSkill(['python', 'java', 'javascript', 'typescript', 'c', 'c++', 'go', 'rust', 'kotlin']) / 9 * 100)) : 0, color: 'bg-blue-500' },
      { label: 'Frameworks', pct: analysis ? Math.min(100, Math.round(hasSkill(['react', 'vue', 'angular', 'django', 'flask', 'fastapi', 'spring', 'express', 'next']) / 9 * 100)) : 0, color: 'bg-cyan' },
      { label: 'Core CS Concepts', pct: analysis ? Math.min(100, Math.round(hasSkill(['dsa', 'sql', 'git', 'api', 'rest', 'testing', 'debugging', 'algorithms', 'data structures']) / 9 * 100)) : 0, color: 'bg-success' },
      { label: 'Tools & Platforms', pct: analysis ? Math.min(100, Math.round(hasSkill(['docker', 'aws', 'gcp', 'kubernetes', 'linux', 'git', 'ci/cd', 'terraform']) / 8 * 100)) : 0, color: 'bg-violet' },
    ]
    const missing = analysis ? [
      ...missingCore.slice(0, 3).map(s => ({ skill: s, priority: 'Critical' as const })),
      ...missingOpt.slice(0, 2).map(s => ({ skill: s, priority: 'High' as const })),
    ] : []
    return { SKILL_COVERAGE: coverage, TOP_MISSING: missing }
  }, [analysis, skills, missingCore, missingOpt])

  const METRICS = useMemo(() => [
    { label: 'Readiness Score', value: analysis ? `${score}%` : '--', sub: analysis ? (chartHistory.length > 1 ? `+${score - chartHistory[0].value}% since first upload` : 'First analysis — upload again to track progress') : 'Upload resume to see score', pct: score, icon: Activity, accent: 'text-primary' },
    { label: 'Skill Gaps Found', value: analysis ? String(missingCount) : '--', sub: analysis ? `${missingCore.length} critical, ${missingOpt.length} optional` : 'Pending analysis', pct: analysis ? Math.min(100, (missingCount / 10) * 100) : 0, icon: AlertCircle, accent: 'text-warning' },
    { label: 'Skills Detected', value: analysis ? String(skills.length) : '--', sub: analysis ? `${corePct}% core coverage` : 'Upload resume', pct: corePct, icon: Lightbulb, accent: 'text-cyan' },
    { label: 'Interview Readiness', value: analysis ? readiness : '--', sub: analysis ? (analytics?.total_analyses ? `${analytics.total_analyses} analyses completed` : 'First analysis') : 'Ready to start', pct: analysis ? score * 0.8 : 0, icon: BarChart2, accent: 'text-violet' },
  ], [analysis, score, corePct, missingCount, missingCore.length, missingOpt.length, readiness, skills, chartHistory, analytics])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero */}
      <motion.div variants={item}>
        <Card className="premium-hover-card relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-violet/5">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {analysis ? `Your Career Readiness: ${score}%` : 'Welcome to Jobyn'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {user ? `Welcome back, ${user.name}! ` : ''}{analysis ? 'ML trained on 57,100 resumes — 95% accuracy. Your data never leaves your browser.' : 'Upload your resume to see your AI-powered career readiness.'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button onClick={() => navigate('/resume-analyzer')} className="gap-2">
                <Upload className="size-4" />
                {analysis ? 'Re-Upload Resume' : 'Upload Resume'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Onboarding Nudge — contextual prompts for incomplete actions */}
      <motion.div variants={item}>
        <OnboardingNudge />
      </motion.div>

      {/* What To Do Today — JTBD Daily Ritual */}
      <motion.div variants={item}>
        <Card className="premium-hover-card relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-violet/5">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Target className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">What to do today</div>
                {!analysis ? (
                  <>
                    <div className="text-sm font-semibold text-foreground">Upload your resume to see your career readiness</div>
                    <div className="text-xs text-muted-foreground mt-0.5">60 seconds to find out where you stand</div>
                  </>
                ) : missingCore.length > 0 ? (
                  <>
                    <div className="text-sm font-semibold text-foreground">
                      Your biggest gap is <span className="text-primary">{missingCore[0]}</span> — start learning it today
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Closing this gap will improve your readiness score by ~{Math.round(100 / (totalCoreSkills || 1))}%
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-foreground">Your core skills are strong — practice an interview</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Test your knowledge with role-specific questions</div>
                  </>
                )}
              </div>
              <Button
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => navigate(
                  !analysis ? '/resume-analyzer'
                    : missingCore.length > 0 ? '/improvement-plan'
                    : '/interview-readiness'
                )}
              >
                {!analysis ? 'Upload'
                  : missingCore.length > 0 ? 'Learn'
                  : 'Practice'} <ArrowRight className="size-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* First-Time Welcome Guide */}
      {isFirstTime && (
        <motion.div variants={item}>
          <Card className="premium-hover-card relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-violet/5">
            <CardContent className="py-8 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Upload className="size-7 text-primary" />
              </div>
              <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">See Where You Stand in 60 Seconds</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Upload your resume. Get your ML-powered readiness score. See exactly what skills to close before placement season.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-500">
                  ✓ 95% ML Accuracy
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">
                  🔒 Processed on-device
                </span>
              </div>
              <div className="mt-6 flex flex-col items-center gap-2">
                <Button size="lg" className="gap-2" onClick={() => navigate('/resume-analyzer')}>
                  <Upload className="size-4" /> Upload Your Resume
                </Button>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-6 sm:gap-10">
                {[
                  { step: '1', label: 'Upload resume', icon: Upload },
                  { step: '2', label: 'Get scored', icon: Target },
                  { step: '3', label: 'Improve & land the job', icon: CheckCircle },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{s.step}</div>
                    <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Analytics Error */}
      {analyticsError && (
        <motion.div variants={item}>
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {analyticsError}
          </div>
        </motion.div>
      )}

      {/* Metric Cards */}
      <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => {
          const Icon = m.icon
          return (
            <Card key={m.label} className="premium-hover-card relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg bg-muted p-1.5 ${m.accent}`}>
                    <Icon className="size-4" />
                  </div>
                  <span className="font-heading text-2xl font-bold tracking-tight text-foreground">{m.value}</span>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
                  <Progress value={m.pct} className="mt-1.5 h-1.5" />
                  <div className="mt-1 text-[11px] text-muted-foreground/70">{m.sub}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Career Milestones — compact progress */}
      <motion.div variants={item}>
        <MilestoneCard analysis={analysis} completedTasks={completedTasks} score={score} />
      </motion.div>

      {/* Skill Coverage + Skill Gaps */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Skill Coverage */}
        <motion.div variants={item}>
          <Card className="premium-hover-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Skill Coverage</CardTitle>
              <CardDescription>Your proficiency across key areas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SKILL_COVERAGE.map((s) => (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="tabular-nums text-muted-foreground">{s.pct}%</span>
                  </div>
                  <Progress value={s.pct} className="h-2" />
                </div>
              ))}
              {!analysis && (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <AlertCircle className="mr-2 size-4" /> Pending Analysis
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Skill Gaps */}
        <motion.div variants={item}>
          <Card className="premium-hover-card h-full">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Skill Gaps</CardTitle>
                <CardDescription>Top critical skills to focus on</CardDescription>
              </div>
              {analysis && (
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('/skill-gap')}>
                  View All <ArrowRight className="size-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {TOP_MISSING.length > 0 ? (
                <div className="space-y-2.5">
                  {TOP_MISSING.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 text-sm font-medium text-foreground">{item.skill}</span>
                      <Badge variant={item.priority === 'Critical' ? 'destructive' : 'secondary'} className="text-xs">
                        {item.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : analysis ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-success">
                  <Trophy className="size-8" />
                  <p className="text-sm font-medium">All skill gaps resolved!</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <AlertCircle className="size-8" />
                  <p className="text-sm">Analyze a resume to see skill gaps</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Best Fit Recommendation */}
      {bestFit && (bestFit.predicted_role !== analysis?.role || (score < 50 && bestFit.confidence > 0.6)) && (
        <motion.div variants={item}>
          <Card className="premium-hover-card border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-violet/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <TrendingUp className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">AI Best Fit Recommendation</CardTitle>
                  <CardDescription>Cross-Role Comparison</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="ml-auto border-primary/20 text-xs uppercase tracking-wider">Skill Similarity</Badge>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Your highest potential role is:</div>
                <div className="mt-1 font-heading text-lg font-bold text-primary">{bestFit.predicted_role}</div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Match Confidence</span>
                    <span className="tabular-nums font-semibold text-primary">{bestFit.confidence ? `${Math.round(bestFit.confidence * 100)}%` : 'N/A'}</span>
                  </div>
                  <Progress value={(bestFit.confidence ?? 0) * 100} className="h-2" />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {bestFit.reasoning || `Based on your skill profile, you are a much stronger match for ${bestFit.predicted_role} than your currently selected path.`}
                </p>
              </div>
              <Button className="mt-4 w-full gap-2" onClick={() => navigate('/resume-analyzer')}>
                Switch to Recommended Path <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Share Your Progress + Peer Benchmarking */}
      {analysis && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <motion.div variants={item}>
            <Card className="premium-hover-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Share Your Progress</CardTitle>
                <CardDescription>Let others know your placement readiness</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-green-500/30 text-green-600 hover:bg-green-500/10"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`I scored ${score}% for ${analysis?.role ?? 'my role'} on Jobyn! Check your placement readiness: ${window.location.origin}/quick-score`)}`, '_blank')}
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Share on WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/quick-score`); }}
                >
                  Copy Invite Link
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <PeerBenchmarkCard role={analysis.role} score={score} />
          </motion.div>
        </div>
      )}

      {/* Quick Actions */}
      <motion.div variants={item} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Upload Resume', icon: Upload, to: '/resume-analyzer', desc: 'Analyze a new resume' },
          { label: 'Start Interview', icon: Zap, to: '/interview-readiness', desc: 'Practice interview questions' },
          { label: 'Study Hub', icon: BookOpen, to: '/improvement-plan', desc: 'Follow your improvement plan' },
        ].map((a) => (
          <Card key={a.to} className="premium-hover-card group cursor-pointer" onClick={() => navigate(a.to)}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-muted p-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <a.icon className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{a.label}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
              </div>
              <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Peer Benchmarking */}
      {benchmark && benchmark.user_percentile !== null && (
        <motion.div variants={item}>
          <Card className="premium-hover-card border-accent/20 bg-gradient-to-br from-accent/5 via-transparent to-primary/5">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-accent/10 p-2.5">
                <Users className="size-5 text-accent" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">
                  You're in the top {100 - benchmark.user_percentile}% of {analysis?.role} candidates
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Based on {benchmark.total_analyses.toLocaleString()} analyses &middot; Median score: {benchmark.median_score}
                </div>
              </div>
              <Badge variant="outline" className="border-accent/30 text-accent font-bold text-lg px-3 py-1">
                {benchmark.user_percentile}th
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Share Progress */}
      {analysis && (
        <motion.div variants={item}>
          <Card className="premium-hover-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-green-500/10 p-2.5">
                <Share2 className="size-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">Share Your Progress</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {score}% readiness for {analysis.role}
                </div>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`I just scored ${score}% for ${analysis.role} on Jobyn! Check your placement readiness: ${window.location.origin}/quick-score`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1da851] transition-colors"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share on WhatsApp
              </a>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
