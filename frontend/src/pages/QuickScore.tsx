import { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { quickScoreUpload, type QuickScoreResult } from '../api/client'
import LogoMark from '../components/LogoMark'
import CircularProgress from '../components/CircularProgress'
import {
  Upload, FileText, CheckCircle, ArrowRight, Zap, Shield, Clock, Target,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import SEO from '../components/SEO'
import JsonLd from '../components/JsonLd'

const LOADING_STAGES = [
  { icon: FileText, label: 'Parsing your resume' },
  { icon: Zap, label: 'Extracting skills & experience' },
  { icon: Target, label: 'Scoring placement readiness' },
]

export default function QuickScore() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [stageIdx, setStageIdx] = useState(-1)
  const [result, setResult] = useState<QuickScoreResult | null>(null)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)

  const handleFile = useCallback((f: File) => {
    const MAX_SIZE = 5 * 1024 * 1024
    if (f.size > MAX_SIZE) { setError('File must be under 5 MB.'); return }
    const ok = f.name.endsWith('.pdf') || f.name.endsWith('.docx')
    if (!ok) { setError('Only PDF and DOCX files are supported.'); return }
    setFile(f); setError(''); setResult(null)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return
    setLoading(true); setError(''); setResult(null); setStageIdx(0)

    // Animate stages
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setStageIdx(1), 800))
    timers.push(setTimeout(() => setStageIdx(2), 1600))

    try {
      const data = await quickScoreUpload(file)
      setResult(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed. Make sure the backend is running.'
      setError(msg)
    } finally {
      timers.forEach(t => clearTimeout(t))
      setLoading(false)
      setStageIdx(-1)
    }
  }, [file])

  const readinessColor = result
    ? result.score >= 75 ? 'text-success'
      : result.score >= 50 ? 'text-primary'
      : 'text-warning'
    : ''

  const readinessBadgeVariant = result
    ? result.score >= 75 ? 'default' as const
      : result.score >= 50 ? 'secondary' as const
      : 'destructive' as const
    : 'secondary' as const

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Free Resume Score — Get Placement Ready in 30 Seconds"
        description="Get instant AI-powered resume score without signup. Trained on 57,100 real resumes. Identify your placement readiness in 30 seconds."
        keywords="free resume score, resume analyzer, placement readiness, career score"
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Jobyn Free Resume Score',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url: 'https://getjobyn.pages.dev/quick-score',
          description:
            'Instant AI-powered resume score for engineering students — no signup, trained on 57,100 real resumes.',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        }}
      />
      {/* Minimal Header */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <div>
              <span className="font-heading text-sm font-bold tracking-tight text-foreground">Jobyn</span>
              <span className="ml-1 text-xs font-semibold uppercase tracking-widest text-primary">OS</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-xs font-semibold'}>
              Login
            </Link>
            <Link to="/signup" className={buttonVariants({ size: 'sm' }) + ' text-xs font-semibold'}>
              Sign Up <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 text-center"
        >
          <Badge variant="outline" className="mb-4 gap-1.5 border-primary/20 text-[11px] uppercase tracking-wider">
            <Zap className="size-3" /> Instant Score
          </Badge>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Get Your Placement Score <span className="gradient-text">in 30 Seconds</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-lg mx-auto">
            Drop your resume below. No signup required. ML trained on 57,100 resumes with 95% accuracy.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-500">
              <Shield className="size-3" /> No data stored
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">
              <Clock className="size-3" /> 30-second analysis
            </span>
          </div>
        </motion.div>

        {/* Upload Zone */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              className={`premium-hover-card group relative cursor-pointer overflow-hidden transition-all ${drag ? 'border-primary shadow-glow scale-[1.01]' : file ? 'border-primary/30' : 'hover:border-primary/20 hover:shadow-lg'}`}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => !file && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".pdf,.docx" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
              <CardContent className="flex flex-col items-center justify-center py-10">
                {!file ? (
                  <>
                    <div className="mb-4 rounded-2xl bg-primary/5 p-4">
                      <Upload className="size-10 text-primary/60" strokeWidth={1.5} />
                    </div>
                    <div className="text-base font-semibold text-foreground">Drag & drop your resume</div>
                    <div className="mt-1 text-sm text-muted-foreground">PDF or DOCX up to 5MB</div>
                    <Button size="sm" className="mt-4" onClick={e => { e.stopPropagation(); inputRef.current?.click() }}>
                      Browse Files
                    </Button>
                  </>
                ) : (
                  <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <FileText className="size-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{file.name}</div>
                        <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setFile(null); setError('') }}>
                        Change
                      </Button>
                      <Button disabled={loading} onClick={e => { e.stopPropagation(); handleUpload() }}>
                        {loading ? (
                          <><span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Scoring&hellip;</>
                        ) : (
                          <><Zap className="mr-2 size-4" /> Get My Score</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        {/* Loading Stages */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
            >
              <Card className="premium-hover-card">
                <CardContent className="py-4">
                  <div className="space-y-3">
                    {LOADING_STAGES.map((stage, i) => {
                      const Icon = stage.icon
                      const done = stageIdx > i
                      const active = stageIdx === i
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-primary/5 text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}
                        >
                          {done ? <CheckCircle className="size-4 text-success" /> : <Icon className={`size-4 ${active ? 'animate-pulse' : ''}`} />}
                          <span className={done ? 'line-through opacity-60' : ''}>{stage.label}</span>
                          {active && <span className="ml-auto size-1.5 animate-pulse rounded-full bg-primary" />}
                        </motion.div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Score Card */}
            <Card className="premium-hover-card relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-violet/5">
              <CardContent className="flex flex-col items-center py-8">
                <CircularProgress
                  pct={result.score}
                  size={140}
                  stroke={12}
                  label="Readiness"
                />

                <h2 className="mt-4 font-heading text-xl font-bold text-foreground">{result.role}</h2>
                <Badge variant={readinessBadgeVariant} className="mt-1.5">
                  {result.readiness_category}
                </Badge>

                <div className="mt-6 flex items-center gap-6 text-center">
                  <div>
                    <div className={`font-heading text-2xl font-bold ${readinessColor}`}>{result.score}%</div>
                    <div className="text-xs text-muted-foreground">Overall Score</div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <div className="font-heading text-2xl font-bold text-warning">{result.missing_count}</div>
                    <div className="text-xs text-muted-foreground">Skill Gaps</div>
                  </div>
                </div>

                {/* Provisional score — unlock headroom by verifying skills */}
                {(result.score_headroom ?? 0) > 0 && (
                  <div className="mt-6 w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-foreground">
                      🔓 Unlock up to <span className="text-primary">+{result.score_headroom}</span> points
                      {result.verified_score ? <> → <span className="text-primary">{result.verified_score}%</span></> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      This is a <strong>provisional</strong> score. Some skills are listed but unverified — confirm them with a 60-second skill check to boost it.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="premium-hover-card relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-violet/5">
              <CardContent className="py-6 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Target className="size-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">Unlock Full Analysis</h3>
                <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
                  See your missing skills, improvement plan, interview readiness, and AI-powered study notes.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
                  <Link to="/signup" className={buttonVariants({ size: 'lg' }) + ' gap-2 rounded-full px-8 font-semibold'}>
                    Create Free Account <ArrowRight className="size-4" />
                  </Link>
                  <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' gap-2 rounded-full px-8 font-semibold'}>
                    Login
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {['Skill Gap Analysis', 'Improvement Plan', 'Mock Interviews', 'Company Prep'].map(f => (
                    <span key={f} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <CheckCircle className="size-3 text-success" /> {f}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Re-upload */}
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={() => { setResult(null); setFile(null) }}
              >
                <Upload className="size-3" /> Analyze a different resume
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
