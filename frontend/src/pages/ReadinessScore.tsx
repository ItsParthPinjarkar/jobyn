import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useResume, getReadinessClass } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'
import { uploadResume, predictResume, getBenchmarks, type BenchmarkData } from '../api/client'
import AuthRequiredPrompt from '../components/AuthRequiredPrompt'
import CircularProgress from '../components/CircularProgress'
import { Cpu, Cloud, Zap, TrendingUp, AlertCircle, Shield, ArrowRight, FlaskConical, ThumbsUp, ThumbsDown, Users, Share2, ShieldCheck } from 'lucide-react'
import SkillVerification from '../components/SkillVerification'
import { usePrivacy } from '../context/PrivacyContext'
import { predictOnDevice, isOnDeviceReady } from '../utils/onDevicePredictor'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

const CLASSES = [
  { label: 'Beginner', range: '0–40%', min: 0, max: 40 },
  { label: 'Developing', range: '41–60%', min: 41, max: 60 },
  { label: 'Placement Ready', range: '61–80%', min: 61, max: 80 },
  { label: 'Interview Ready', range: '81–100%', min: 81, max: 100 },
]

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } } }

function BenchmarkBadge({ role }: { role?: string }) {
  const [data, setData] = useState<BenchmarkData | null>(null)
  useEffect(() => {
    if (!role) return
    getBenchmarks(role).then(setData).catch(() => {})
  }, [role])
  if (!data || !data.user_percentile || data.total_analyses < 5) return null
  const topPct = Math.max(1, 100 - data.user_percentile)
  return (
    <Badge variant="outline" className="gap-1.5 border-accent/30 text-accent">
      Top {topPct}% of {data.total_analyses} candidates
    </Badge>
  )
}

export default function ReadinessScore() {
  const { analysis, prediction, bestFit, setAnalysis, setPrediction, currentFile } = useResume()
  const { privacy } = usePrivacy()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const [outcomeSubmitted, setOutcomeSubmitted] = useState(false)
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null)

  useEffect(() => {
    if (!analysis?.role) return
    getBenchmarks(analysis.role).then(setBenchmark).catch(() => {})
  }, [analysis?.role])

  if (!user) {
    return <AuthRequiredPrompt feature="Readiness Score" />
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-2xl bg-muted p-4">
          <TrendingUp className="size-10 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground">No Analysis Available</h2>
        <p className="max-w-md text-sm text-muted-foreground">Upload and analyze your resume to see your readiness score breakdown.</p>
        <Button onClick={() => navigate('/resume-analyzer')} className="gap-2">
          <ArrowRight className="size-4" /> Upload Resume
        </Button>
      </div>
    )
  }

  const [verifyOpen, setVerifyOpen] = useState(false)
  const [unlockedScore, setUnlockedScore] = useState<number | null>(null)
  const headroom = analysis?.score_headroom ?? 0
  // Show the provisional score (or the unlocked value after verification).
  const score = unlockedScore ?? analysis?.provisional_score ?? analysis?.final_score ?? 0
  const current = getReadinessClass(score)
  const corePct = analysis?.core_coverage_percent ?? 0
  const projectPct = analysis?.project_score_percent ?? 0
  const atsPct = analysis?.ats_score_percent ?? 0
  const structPct = analysis?.structure_score_percent ?? 0
  const optPct = analysis?.optional_coverage_percent ?? 0

  const BREAKDOWN = [
    { label: 'Core Skill Coverage', pct: corePct, weight: 35, color: 'bg-primary', tip: 'Measures how many must-have skills for your target role appear in your resume. These are the skills recruiters filter for first — languages, frameworks, and tools listed in the job description. A low score means key skills are missing from your resume text.' },
    { label: 'Projects & Experience', pct: projectPct, weight: 25, color: 'bg-cyan', tip: 'Evaluates the quality and relevance of your projects and work experience. It checks if your projects use the right tech stack for your role, have clear descriptions, and demonstrate real-world application. GitHub links, deployed URLs, and quantified impact boost this score.' },
    { label: 'ATS Compatibility', pct: atsPct, weight: 20, color: 'bg-success', tip: 'Checks if your resume can pass through Applicant Tracking Systems (ATS) that companies use to filter resumes. Factors include: proper section headings, standard fonts, no images/tables, keyword density matching the job description, and clean file format.' },
    { label: 'Resume Structure', pct: structPct, weight: 10, color: 'bg-violet', tip: 'Reviews the layout and organization of your resume. Looks for standard sections (Education, Skills, Projects, Experience), consistent formatting, appropriate length (1 page for freshers), and logical ordering. A well-structured resume is easier for both ATS and humans to scan.' },
    { label: 'Optional Skills', pct: optPct, weight: 10, color: 'bg-warning', tip: 'Bonus points for nice-to-have skills that differentiate you from other candidates — things like Docker, CI/CD, testing frameworks, cloud platforms, or soft skills. These aren\'t required but make you stand out. Think of them as tiebreakers.' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Readiness Score</h1>
        <p className="text-sm text-muted-foreground">Detailed scoring breakdown &middot; All values from your resume analysis</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Score + Prediction Card */}
        <motion.div variants={item}>
          <Card className="premium-hover-card flex h-full flex-col items-center justify-center">
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <CircularProgress pct={score} size={160} stroke={14} color="hsl(var(--primary))" label="Overall" />
              <div className="text-center">
                <div className="font-heading text-lg font-bold text-foreground">{current}</div>
                {analysis?.role && <div className="text-xs text-muted-foreground">for {analysis.role}</div>}
              </div>

              {/* Provisional score — verify unverified skills to unlock headroom */}
              {headroom > 0 && unlockedScore === null && (
                <div className="w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    🔓 Provisional — unlock <span className="text-primary">+{headroom}</span>
                    {analysis?.verified_score ? <> → <span className="text-primary">{analysis.verified_score}</span></> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Some listed skills aren’t verified yet.</p>
                  <Button size="sm" className="mt-2 gap-1.5" onClick={() => setVerifyOpen(true)}>
                    <ShieldCheck className="size-4" /> Verify my skills
                  </Button>
                </div>
              )}
              {unlockedScore !== null && (
                <p className="text-sm font-medium text-success">✓ Unlocked — score now {unlockedScore}</p>
              )}
              {analysis && (
                <SkillVerification
                  open={verifyOpen}
                  onClose={() => setVerifyOpen(false)}
                  role={analysis.role}
                  skills={analysis.detected_skills}
                  rawText={analysis.raw_text}
                  sections={analysis.sections_detected}
                  onUnlocked={(s) => setUnlockedScore(s)}
                />
              )}

              {/* Peer Benchmark Badge */}
              {benchmark && benchmark.user_percentile !== null && (
                <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-1.5">
                  <Users className="size-3.5 text-accent" />
                  <span className="text-xs font-semibold text-accent">
                    Top {100 - benchmark.user_percentile}% &middot; {benchmark.total_analyses.toLocaleString()} students
                  </span>
                </div>
              )}

              {/* Share Row */}
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`I scored ${score}% for ${analysis?.role} on Jobyn! Check your placement readiness: ${window.location.origin}/quick-score`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1da851] transition-colors"
                >
                  <Share2 className="size-3" /> WhatsApp
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A66C2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#095196] transition-colors"
                >
                  <Share2 className="size-3" /> LinkedIn
                </a>
              </div>
              <BenchmarkBadge role={analysis?.role} />

              {prediction && (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="outline" className={`gap-1.5 ${prediction.model_version.includes('onnx') ? 'border-success/30 text-success' : 'border-primary/30 text-primary'}`}>
                      {prediction.model_version.includes('onnx') ? <Shield className="size-3" /> : <Cloud className="size-3" />}
                      {prediction.model_version.includes('onnx') ? 'Verified AI Engine' : 'Cloud Intelligence'}
                      {prediction.inference_time_ms != null && prediction.inference_time_ms > 0 && (
                        <span className="opacity-60">&middot; {prediction.inference_time_ms.toFixed(1)}ms</span>
                      )}
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 border-warning/30 text-warning">
                      <FlaskConical className="size-3" />
                      ML Predictions — Beta
                    </Badge>
                  </div>

                  <div className={`w-full rounded-xl border p-4 ${score < 50 ? 'border-warning/30 bg-warning/5' : 'border-primary/15 bg-primary/5'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`rounded-md p-1.5 ${score < 50 ? 'bg-warning/20 text-warning' : 'bg-primary/15 text-primary'}`}>
                        {score < 50 ? <AlertCircle className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${score < 50 ? 'text-warning' : 'text-primary'}`}>
                        {score < 50 ? 'Skill Gap Alert' : 'Path Intelligence'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-bold text-foreground">
                      {score < 50
                        ? `Developing for ${analysis?.role}`
                        : (prediction.predicted_role === analysis?.role && score > 70
                          ? `High Match for ${prediction.predicted_role}`
                          : `Potential Path: ${bestFit?.predicted_role || prediction.predicted_role}`)
                      }
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {score < 50
                        ? `Your readiness for ${analysis?.role} is currently introductory (${score}%). We recommend focusing on the missing core skills in your Improvement Plan.`
                        : (bestFit?.reasoning || prediction.explanation || `Your profile shows strong semantic alignment with the ${prediction.predicted_role} career path.`)
                      }
                    </div>
                    <div className="mt-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-[11px] leading-relaxed text-warning/80">
                      This prediction is based on training data from 57,100 resumes. Use as a directional indicator, not a definitive assessment.
                    </div>
                    {!outcomeSubmitted && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Was this prediction helpful?</span>
                        <button
                          className="inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-0.5 text-xs hover:bg-success/10 hover:text-success transition-colors"
                          onClick={async () => {
                            try {
                              const { apiFetch } = await import('../api/client')
                              await apiFetch('/ml/outcome', {
                                method: 'POST',
                                rawBody: JSON.stringify({
                                  predicted_role: prediction.predicted_role,
                                  confidence: prediction.confidence,
                                  actual_role: analysis?.role || '',
                                  helpful: true,
                                }),
                              })
                              setOutcomeSubmitted(true)
                            } catch { setOutcomeSubmitted(true) }
                          }}
                        >
                          <ThumbsUp className="size-3" /> Yes
                        </button>
                        <button
                          className="inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-0.5 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={async () => {
                            try {
                              const { apiFetch } = await import('../api/client')
                              await apiFetch('/ml/outcome', {
                                method: 'POST',
                                rawBody: JSON.stringify({
                                  predicted_role: prediction.predicted_role,
                                  confidence: prediction.confidence,
                                  actual_role: analysis?.role || '',
                                  helpful: false,
                                }),
                              })
                              setOutcomeSubmitted(true)
                            } catch { setOutcomeSubmitted(true) }
                          }}
                        >
                          <ThumbsDown className="size-3" /> No
                        </button>
                      </div>
                    )}
                    {outcomeSubmitted && (
                      <div className="mt-2 text-[11px] text-success/70">Thanks for your feedback!</div>
                    )}

                    {bestFit && bestFit.predicted_role !== analysis?.role && (
                      <>
                        <Button
                          size="sm"
                          className="mt-3 w-full gap-2"
                          disabled={switching || !currentFile}
                          onClick={async () => {
                            if (!currentFile || !bestFit.predicted_role) return
                            setSwitching(true); setSwitchError(null)
                            try {
                              const result = await uploadResume(currentFile, bestFit.predicted_role, privacy, user?.email)
                              setAnalysis(result)
                            } catch (err: unknown) {
                              setSwitchError(err instanceof Error ? err.message : 'Failed to switch role. Please try again.')
                            } finally { setSwitching(false) }
                          }}
                        >
                          {switching
                            ? <><span className="mr-2 size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> Switching&hellip;</>
                            : <><Zap className="size-3.5" /> {score < 50 ? 'Switch to Highest Match Role' : 'Apply Suggested Path'}</>
                          }
                        </Button>
                        {switchError && (
                          <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                            <AlertCircle className="size-3" /> {switchError}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weighted Breakdown */}
        <motion.div variants={item}>
          <Card className="premium-hover-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Weighted Breakdown</CardTitle>
              <CardDescription>How each metric contributes to your final score</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TooltipProvider>
              {BREAKDOWN.map(b => (
                <div key={b.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      {b.label}
                      <Tooltip>
                        <TooltipTrigger className="inline-flex text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                          <Info className="size-3" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-left">
                          <p>{b.tip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {Math.round(b.pct)}% <span className="text-xs opacity-60">(&times;{b.weight}%)</span>
                    </span>
                  </div>
                  <Progress value={Math.min(100, Math.round(b.pct))} className="h-2" />
                </div>
              ))}
              </TooltipProvider>
              <div className="mt-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                Final Score = ({corePct}&times;0.35) + ({projectPct}&times;0.25) + ({atsPct}&times;0.20) + ({structPct}&times;0.10) + ({optPct}&times;0.10) ={' '}
                <strong className="text-primary">{score}</strong>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Readiness Classification */}
      <motion.div variants={item}>
        <Card className="premium-hover-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Readiness Classification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CLASSES.map((c) => (
                <div
                  key={c.label}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    c.label === current
                      ? 'border-primary bg-primary/5 shadow-glow'
                      : 'border-border/50 bg-muted/20'
                  }`}
                >
                  <div className={`text-sm font-bold ${c.label === current ? 'text-primary' : 'text-foreground'}`}>{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.range}</div>
                  {c.label === current && (
                    <Badge className="mt-1.5 text-xs">Current</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
