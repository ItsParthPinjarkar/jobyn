import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useResume } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'
import { matchJD, getJDMatchHistory, type JDMatchResult, type JDMatchHistoryEntry } from '../api/client'
import AuthRequiredPrompt from '../components/AuthRequiredPrompt'
import CircularProgress from '../components/CircularProgress'
import {
  Search, ArrowRight, CheckCircle, AlertTriangle, Clock, Briefcase, Building2, Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
}

export default function JDMatch() {
  const navigate = useNavigate()
  const { analysis } = useResume()
  const { user } = useAuth()

  const [jdText, setJdText] = useState('')
  const [jdTitle, setJdTitle] = useState('')
  const [jdCompany, setJdCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<JDMatchResult | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<JDMatchHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Fetch history on mount
  useEffect(() => {
    if (!analysis) return
    const ctl = new AbortController()
    setHistoryLoading(true)
    getJDMatchHistory()
      .then(data => { if (!ctl.signal.aborted) setHistory(data) })
      .catch(() => {})
      .finally(() => { if (!ctl.signal.aborted) setHistoryLoading(false) })
    return () => ctl.abort()
  }, [analysis])

  const handleMatch = useCallback(async () => {
    if (!jdText.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await matchJD(jdText.trim(), jdTitle.trim() || undefined, jdCompany.trim() || undefined)
      setResult(data)
      // Refresh history
      getJDMatchHistory().then(setHistory).catch(() => {})
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Matching failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [jdText, jdTitle, jdCompany])

  const getStrengthColor = (strength: string) => {
    switch (strength.toLowerCase()) {
      case 'strong': return 'default' as const
      case 'moderate': return 'secondary' as const
      default: return 'destructive' as const
    }
  }

  // Locked state
  if (!user) {
    return <AuthRequiredPrompt feature="JD Matching" />
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Search className="size-7 text-primary" />
        </div>
        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          JD Matching
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          Upload and analyze your resume first to match against job descriptions.
        </p>
        <Button size="lg" className="mt-6 gap-2" onClick={() => navigate('/resume-analyzer')}>
          <Search className="size-4" /> Analyze Resume First
        </Button>
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <Badge variant="outline" className="gap-1.5 border-primary/20 text-[11px] uppercase tracking-wider">
          <Search className="size-3" /> JD Intelligence
        </Badge>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Job Description <span className="gradient-text">Matcher</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste any job description to see how well your resume matches. Identify gaps before you apply.
        </p>
      </motion.div>

      {/* Input Section */}
      <motion.div variants={item}>
        <Card className="premium-hover-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Paste Job Description</CardTitle>
            <CardDescription>Copy the full JD text from the job posting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Job Title (optional)</label>
                <Input
                  placeholder="e.g. Backend Developer"
                  value={jdTitle}
                  onChange={e => setJdTitle(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Company (optional)</label>
                <Input
                  placeholder="e.g. Google"
                  value={jdCompany}
                  onChange={e => setJdCompany(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Job Description</label>
              <Textarea
                placeholder="Paste the full job description here..."
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                disabled={loading}
                className="min-h-[140px] resize-y"
              />
            </div>
            <Button
              className="w-full gap-2 sm:w-auto"
              onClick={handleMatch}
              disabled={loading || !jdText.trim()}
            >
              {loading ? (
                <><span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Matching&hellip;</>
              ) : (
                <><Sparkles className="size-4" /> Match Against My Resume</>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div variants={item} className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" /> {error}
        </motion.div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Match Score */}
          <motion.div variants={item}>
            <Card className="premium-hover-card relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-violet/5">
              <CardContent className="flex flex-col items-center py-8 sm:flex-row sm:items-center sm:gap-8">
                <CircularProgress
                  pct={result.jd_match_score}
                  size={130}
                  stroke={12}
                  label="Match"
                />
                <div className="mt-4 flex-1 text-center sm:mt-0 sm:text-left">
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <h3 className="font-heading text-lg font-bold text-foreground">Match Score: {result.jd_match_score}%</h3>
                    <Badge variant={getStrengthColor(result.match_strength)}>
                      {result.match_strength}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {result.jd_match_score >= 75
                      ? 'Strong match! You are a great fit for this role.'
                      : result.jd_match_score >= 50
                      ? 'Moderate match. A few skills to close before applying.'
                      : 'Weak match. Focus on the missing skills below before applying.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Skills Breakdown */}
          <motion.div variants={item} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Matched Skills */}
            <Card className="premium-hover-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-success" />
                  <CardTitle className="text-base">Matched Skills</CardTitle>
                </div>
                <CardDescription>{result.matched_skills.length} skills aligned</CardDescription>
              </CardHeader>
              <CardContent>
                {result.matched_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.matched_skills.map(s => (
                      <Badge key={s} variant="outline" className="border-success/30 bg-success/5 text-success text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No matched skills found.</p>
                )}
              </CardContent>
            </Card>

            {/* Missing Skills */}
            <Card className="premium-hover-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-warning" />
                  <CardTitle className="text-base">Missing Skills</CardTitle>
                </div>
                <CardDescription>{result.missing_skills.length} skills to develop</CardDescription>
              </CardHeader>
              <CardContent>
                {result.missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.missing_skills.map(s => {
                      const isHigh = result.high_priority_missing.includes(s)
                      return (
                        <Badge
                          key={s}
                          variant={isHigh ? 'destructive' : 'outline'}
                          className={`text-xs cursor-pointer hover:opacity-80 ${!isHigh ? 'border-warning/30 bg-warning/5 text-warning' : ''}`}
                          onClick={() => navigate('/improvement-plan', { state: { highlightSkill: s } })}
                        >
                          {s}
                          {isHigh && <span className="ml-1 text-[9px] uppercase">High</span>}
                        </Badge>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No missing skills — you are a perfect match!</p>
                )}
                {result.high_priority_missing.length > 0 && (
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => navigate('/improvement-plan', { state: { highlightSkill: result.high_priority_missing[0] } })}
                    >
                      Study Missing Skills <ArrowRight className="size-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* High Priority */}
          {result.high_priority_missing.length > 0 && (
            <motion.div variants={item}>
              <Card className="premium-hover-card border-destructive/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-destructive" />
                    <CardTitle className="text-base">High Priority Gaps</CardTitle>
                  </div>
                  <CardDescription>These skills are critical for this role — focus here first</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.high_priority_missing.map((s, i) => (
                      <div key={s} className="flex items-center gap-3 rounded-lg border border-destructive/10 bg-destructive/5 px-3 py-2.5">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-xs font-bold text-destructive">{i + 1}</span>
                        <span className="flex-1 text-sm font-medium text-foreground">{s}</span>
                        <Badge variant="destructive" className="text-xs">Critical</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}

      {/* History */}
      <motion.div variants={item}>
        <Card className="premium-hover-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Match History</CardTitle>
            </div>
            <CardDescription>Your past JD match analyses</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-2">
                {history.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-primary/10 p-1.5">
                        {entry.jd_company ? <Building2 className="size-4 text-primary" /> : <Briefcase className="size-4 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {entry.jd_title || 'Untitled Position'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.jd_company && <span>{entry.jd_company} &middot; </span>}
                          {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={getStrengthColor(entry.match_strength)} className="text-xs">
                        {entry.match_score}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                <Search className="size-8" />
                <p className="text-sm">No matches yet. Paste a JD above to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
