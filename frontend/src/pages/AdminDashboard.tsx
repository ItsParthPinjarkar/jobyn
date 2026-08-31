import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Check, X, Shield, Users, BookOpen, TrendingUp, AlertCircle, Database, Search,
  RefreshCcw, Activity, ArrowLeft, Terminal, Cpu, Zap, FileText, Trash2,
  MessageSquareWarning, Star, AlertTriangle, Lightbulb,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getAdminStats, getPendingContributions, approveContribution,
  rejectContribution, getFullDataset, deleteAnalysis,
  getFeedbackSummary, getFeedbackCorrections, getContentFeedbackSummary, getLowRatedContent,
} from '../api/client'
import type {
  AdminStats, Contribution, AdminStudent,
  FeedbackSummary, FeedbackCorrection, ContentFeedbackSummary, LowRatedContent,
} from '../api/client'
import { LoadingState, ErrorState } from '../components/StateDisplay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedView = searchParams.get('view')
  const setSelectedView = (view: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (view) next.set('view', view)
      else next.delete('view')
      return next
    })
  }
  const [viewingStudent, setViewingStudent] = useState<AdminStudent | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [totalStudents, setTotalStudents] = useState(0)
  const perPage = 50

  // --- Feedback Review state ---
  const [fbSummary, setFbSummary] = useState<FeedbackSummary | null>(null)
  const [fbCorrections, setFbCorrections] = useState<FeedbackCorrection[]>([])
  const [fbCorrectionsTotal, setFbCorrectionsTotal] = useState(0)
  const [contentSummary, setContentSummary] = useState<ContentFeedbackSummary | null>(null)
  const [lowRated, setLowRated] = useState<LowRatedContent[]>([])
  const [fbLoading, setFbLoading] = useState(false)
  const [fbError, setFbError] = useState<string | null>(null)
  const [fbPage, setFbPage] = useState(1)
  const fbPerPage = 50

  const fetchFeedback = async () => {
    setFbLoading(true)
    setFbError(null)
    try {
      const [summary, corrections, content, low] = await Promise.all([
        getFeedbackSummary(fbPage, fbPerPage),
        getFeedbackCorrections(fbPage, fbPerPage),
        getContentFeedbackSummary(),
        getLowRatedContent(3.0),
      ])
      setFbSummary(summary)
      setFbCorrections(corrections.corrections)
      setFbCorrectionsTotal(corrections.total)
      setContentSummary(content)
      setLowRated(low)
    } catch (err: unknown) {
      setFbError(err instanceof Error ? err.message : 'Failed to load feedback data')
    } finally { setFbLoading(false) }
  }

  useEffect(() => {
    if (selectedView === 'feedback') fetchFeedback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedView, fbPage])

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const [s, c, d] = await Promise.all([getAdminStats(), getPendingContributions(), getFullDataset(page, perPage)])
      setStats(s); setContributions(c); setStudents(d.students); setTotalStudents(d.total)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData(false) }, [page])
  useEffect(() => { if (viewingStudent) overlayRef.current?.focus() }, [viewingStudent])

  const handleApprove = async (id: number) => { await approveContribution(id); fetchData() }
  const handleReject = async (id: number) => { await rejectContribution(id); fetchData() }
  const handleDeleteAnalysis = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Delete this analysis permanently?')) return
    try { await deleteAnalysis(id); fetchData() } catch { alert('Failed to delete') }
  }

  const filteredContributions = contributions.filter(c =>
    c.topic.toLowerCase().includes(filter.toLowerCase()) || c.submitted_by.toLowerCase().includes(filter.toLowerCase())
  )

  if (loading && !selectedView) return <div className="page-content"><LoadingState message="Loading admin data..." /></div>
  if (error && !stats) return <div className="page-content"><ErrorState title="Failed to load admin data" message={error} onRetry={() => fetchData()} /></div>

  // --- Student Directory View ---
  if (selectedView === 'users') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSelectedView(null)}>
          <ArrowLeft className="size-4" /> Back to Command Center
        </Button>
        <Card className="premium-hover-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><Users className="size-5 text-primary" /></div>
                <div>
                  <CardTitle>Student Readiness Pool</CardTitle>
                  <p className="text-xs text-muted-foreground">Performance tracking across all registered users</p>
                </div>
              </div>
              <Badge variant="outline">Total: {totalStudents}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-3 text-xs font-semibold text-muted-foreground">File Ref</th>
                    <th className="p-3 text-xs font-semibold text-muted-foreground">Target Role</th>
                    <th className="p-3 text-xs font-semibold text-muted-foreground">Score</th>
                    <th className="p-3 text-xs font-semibold text-muted-foreground">Top Skills</th>
                    <th className="p-3 text-xs font-semibold text-muted-foreground">ID</th>
                    <th className="p-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.analysis_id} onClick={() => setViewingStudent(s)}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/30">
                      <td className="p-3 font-semibold">{s.filename.split('.')[0]}</td>
                      <td className="p-3 text-muted-foreground">{s.role}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Progress value={s.final_score} className="h-1 w-14" />
                          <span className="text-xs font-bold">{s.final_score}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {s.detected_skills.slice(0, 3).map(sk => <Badge key={sk} variant="outline" className="text-xs">{sk}</Badge>)}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">#{s.analysis_id}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => handleDeleteAnalysis(e, s.analysis_id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t bg-muted/20 p-3 text-xs text-muted-foreground">
                <span>Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, totalStudents)} of {totalStudents}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page * perPage >= totalStudents} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            </div>

            {/* Student Detail Slide-over */}
            <AnimatePresence>
              {viewingStudent && (
                <motion.div ref={overlayRef} tabIndex={-1} onKeyDown={e => { if (e.key === 'Escape') setViewingStudent(null) }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex justify-end bg-black/80 outline-none"
                >
                  <motion.div initial={{ x: 500 }} animate={{ x: 0 }} exit={{ x: 500 }} transition={{ type: 'spring', damping: 25 }}
                    className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-card p-6"
                  >
                    <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setViewingStudent(null)}>
                      <X className="size-5" />
                    </Button>
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><FileText className="size-5 text-primary" /></div>
                      <div>
                        <h2 className="font-heading text-lg font-bold">Analysis View</h2>
                        <p className="text-xs text-muted-foreground">Resume ID: {viewingStudent.resume_id}</p>
                      </div>
                    </div>
                    <Card className="premium-hover-card mb-4"><CardContent className="p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Target Role Profile</p>
                      <p className="mb-3 font-heading text-lg font-bold">{viewingStudent.role}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted/30 p-2.5"><p className="text-xs text-muted-foreground">Readiness</p><p className="text-sm font-bold">{viewingStudent.final_score}%</p></div>
                        <div className="rounded-lg bg-muted/30 p-2.5"><p className="text-xs text-muted-foreground">ATS Score</p><p className="text-sm font-bold">{viewingStudent.ats_score_percent}%</p></div>
                      </div>
                    </CardContent></Card>
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-bold text-foreground">Detected Skills</p>
                      <div className="flex flex-wrap gap-1">{viewingStudent.detected_skills.map(s => <Badge key={s} variant="outline">{s}</Badge>)}</div>
                    </div>
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-bold text-foreground">Missing Core Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {viewingStudent.missing_core_skills.length > 0
                          ? viewingStudent.missing_core_skills.map(s => <Badge key={s} variant="destructive">{s}</Badge>)
                          : <span className="text-xs text-green-500">All core skills present</span>}
                      </div>
                    </div>
                    <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
                      <p className="mb-1 font-bold">Analysis metadata</p>
                      Filename: {viewingStudent.filename}<br />
                      Analyzed: {new Date(viewingStudent.analyzed_at).toLocaleString()}<br />
                      Structure: {viewingStudent.structure_score_percent}% | Project: {viewingStudent.project_score_percent}%
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // --- Feedback Review View (admin-only sensitive data) ---
  if (selectedView === 'feedback') {
    const scoreDist = fbSummary?.score_distribution
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSelectedView(null)}>
            <ArrowLeft className="size-4" /> Back to Command Center
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => fetchFeedback()} disabled={fbLoading}>
            <RefreshCcw className="size-3.5" /> Refresh
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10"><MessageSquareWarning className="size-5 text-amber-500" /></div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Feedback Review</h1>
            <p className="text-sm text-muted-foreground">Model corrections and study-content quality signals</p>
          </div>
        </div>

        {fbLoading && !fbSummary ? (
          <LoadingState message="Loading feedback data..." />
        ) : fbError && !fbSummary ? (
          <ErrorState title="Failed to load feedback" message={fbError} onRetry={() => fetchFeedback()} />
        ) : (
          <>
            {/* Prediction feedback summary */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: 'Total Feedback', value: fbSummary?.total_feedback ?? 0, icon: MessageSquareWarning, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Corrections', value: fbSummary?.corrections ?? 0, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { label: 'Confirmations', value: fbSummary?.confirmations ?? 0, icon: Check, color: 'text-green-500', bg: 'bg-green-500/10' },
                { label: 'Avg Content Rating', value: contentSummary?.average_rating != null ? `${contentSummary.average_rating}★` : '—', icon: Star, color: 'text-violet-500', bg: 'bg-violet-500/10' },
              ].map((m, i) => (
                <Card key={i} className="premium-hover-card">
                  <CardContent className="p-5">
                    <div className={`mb-2 flex size-8 items-center justify-center rounded-lg ${m.bg}`}>
                      <m.icon className={`size-4 ${m.color}`} />
                    </div>
                    <div className="font-heading text-2xl font-black text-foreground">{m.value}</div>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Score feedback distribution */}
            {scoreDist && (
              <Card className="premium-hover-card">
                <CardHeader><CardTitle className="text-base">Score Feedback Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-red-500/5 p-3"><p className="text-xs text-red-500">Too High</p><p className="text-lg font-bold text-red-500">{scoreDist.too_high}</p></div>
                    <div className="rounded-lg bg-amber-500/5 p-3"><p className="text-xs text-amber-500">Too Low</p><p className="text-lg font-bold text-amber-500">{scoreDist.too_low}</p></div>
                    <div className="rounded-lg bg-green-500/5 p-3"><p className="text-xs text-green-500">Accurate</p><p className="text-lg font-bold text-green-500">{scoreDist.accurate}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mispredictions / corrections table (sensitive) */}
            <Card className="premium-hover-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    Role Mispredictions <Badge variant="outline">{fbCorrectionsTotal}</Badge>
                  </CardTitle>
                  <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-500"><Shield className="size-3" /> Sensitive</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {fbCorrections.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b bg-muted/30">
                        <tr>
                          <th className="p-3 text-xs font-semibold text-muted-foreground">User</th>
                          <th className="p-3 text-xs font-semibold text-muted-foreground">Predicted</th>
                          <th className="p-3 text-xs font-semibold text-muted-foreground">Correct</th>
                          <th className="p-3 text-xs font-semibold text-muted-foreground">Analysis</th>
                          <th className="p-3 text-xs font-semibold text-muted-foreground">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fbCorrections.map((c, i) => (
                          <tr key={i} className="border-b transition-colors hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground">{c.user_email ?? '—'}</td>
                            <td className="p-3"><Badge variant="destructive" className="text-xs">{c.predicted_role}</Badge></td>
                            <td className="p-3"><Badge variant="outline" className="border-green-500/40 text-green-600 text-xs">{c.correct_role ?? '—'}</Badge></td>
                            <td className="p-3 font-mono text-xs text-muted-foreground">{c.analysis_id != null ? `#${c.analysis_id}` : '—'}</td>
                            <td className="p-3 text-xs text-muted-foreground">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between border-t bg-muted/20 p-3 text-xs text-muted-foreground">
                      <span>Showing {fbCorrections.length} of {fbCorrectionsTotal}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={fbPage <= 1} onClick={() => setFbPage(p => p - 1)}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={fbPage * fbPerPage >= fbCorrectionsTotal} onClick={() => setFbPage(p => p + 1)}>Next</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-green-500/10"><Check className="size-6 text-green-500" /></div>
                    <p className="text-sm text-muted-foreground">No mispredictions reported.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Content feedback summary */}
              <Card className="premium-hover-card">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4 text-primary" /> Content Quality</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{contentSummary?.total_feedback ?? 0}</p></div>
                    <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Ratings</p><p className="text-lg font-bold">{contentSummary?.rating_count ?? 0}</p></div>
                    <div className="rounded-lg bg-red-500/5 p-3"><p className="text-xs text-red-500">Error Reports</p><p className="text-lg font-bold text-red-500">{contentSummary?.error_reports ?? 0}</p></div>
                    <div className="rounded-lg bg-violet-500/5 p-3"><p className="text-xs text-violet-500">Suggestions</p><p className="text-lg font-bold text-violet-500">{contentSummary?.suggestions ?? 0}</p></div>
                  </div>
                  {contentSummary && contentSummary.recent_errors.length > 0 && (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground"><AlertTriangle className="size-3.5 text-red-500" /> Recent Errors</p>
                      <div className="space-y-2">
                        {contentSummary.recent_errors.map((e, i) => (
                          <div key={i} className="rounded-lg border bg-muted/10 p-2.5 text-xs">
                            <span className="font-semibold text-foreground">{e.skill}</span>
                            {e.section_idx != null && <span className="text-muted-foreground"> · §{e.section_idx}</span>}
                            {e.comment && <p className="mt-1 text-muted-foreground">{e.comment}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {contentSummary && contentSummary.recent_suggestions.length > 0 && (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground"><Lightbulb className="size-3.5 text-violet-500" /> Recent Suggestions</p>
                      <div className="space-y-2">
                        {contentSummary.recent_suggestions.map((s, i) => (
                          <div key={i} className="rounded-lg border bg-muted/10 p-2.5 text-xs">
                            <span className="font-semibold text-foreground">{s.skill}</span>
                            {s.section_idx != null && <span className="text-muted-foreground"> · §{s.section_idx}</span>}
                            {s.comment && <p className="mt-1 text-muted-foreground">{s.comment}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {contentSummary && contentSummary.total_feedback === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">No content feedback yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Low-rated content */}
              <Card className="premium-hover-card">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Star className="size-4 text-amber-500" /> Low-Rated Content</CardTitle></CardHeader>
                <CardContent>
                  {lowRated.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b bg-muted/30">
                          <tr>
                            <th className="p-3 text-xs font-semibold text-muted-foreground">Skill</th>
                            <th className="p-3 text-xs font-semibold text-muted-foreground">Section</th>
                            <th className="p-3 text-xs font-semibold text-muted-foreground">Avg</th>
                            <th className="p-3 text-xs font-semibold text-muted-foreground">Ratings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowRated.map((l, i) => (
                            <tr key={i} className="border-b transition-colors hover:bg-muted/30">
                              <td className="p-3 font-semibold">{l.skill}</td>
                              <td className="p-3 text-muted-foreground">{l.section_idx != null ? `§${l.section_idx}` : 'Overview'}</td>
                              <td className="p-3"><Badge variant="destructive" className="text-xs">{l.average_rating}★</Badge></td>
                              <td className="p-3 text-muted-foreground">{l.rating_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10">
                      <div className="flex size-12 items-center justify-center rounded-full bg-green-500/10"><Check className="size-6 text-green-500" /></div>
                      <p className="text-sm text-muted-foreground">No low-rated content flagged.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </motion.div>
    )
  }

  // --- Database Explorer View ---
  if (selectedView === 'database') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSelectedView(null)}>
          <ArrowLeft className="size-4" /> Back to Command Center
        </Button>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="premium-hover-card border-border bg-card">
            <CardHeader><div className="flex items-center gap-3">
              <Terminal className="size-5 text-primary" />
              <CardTitle className="text-base">Vector Engine Console</CardTitle>
            </div></CardHeader>
            <CardContent>
              <div className="h-80 overflow-y-auto rounded-lg border bg-background p-4 font-mono text-xs leading-relaxed">
                <p className="text-muted-foreground">[Jobyn - System Console]</p>
                <p className="mt-2 text-green-500">&gt; Status: {stats ? 'Connected' : 'Checking...'}</p>
                <p className="text-primary">&gt; Pending Reviews: {stats?.pending_reviews ?? '...'}</p>
                <p className="text-primary">&gt; Approved Content: {stats?.approved_contributions ?? '...'}</p>
                <p className="mt-3 text-muted-foreground">&gt; Active Students: {stats?.active_students ?? '...'}</p>
                <p className="text-muted-foreground">&gt; Cached Courses: {stats?.total_courses_cached ?? '...'}</p>
                <p className="text-muted-foreground">&gt; Analyses in DB: {students.length}</p>
                <p className="mt-4 animate-pulse text-foreground">_</p>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card className="premium-hover-card"><CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2.5"><Cpu className="size-4 text-violet-500" /><span className="text-sm font-bold">Neural Processing Units</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Students</p><p className="text-lg font-bold">{stats?.active_students ?? '--'}</p></div>
                <div className="rounded-lg bg-green-500/5 p-3"><p className="text-xs text-green-500">Courses Cached</p><p className="text-lg font-bold text-green-500">{stats?.total_courses_cached ?? '--'}</p></div>
              </div>
            </CardContent></Card>
            <Card className="premium-hover-card"><CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2.5"><Zap className="size-4 text-primary" /><span className="text-sm font-bold">Cache Strategy</span></div>
              <p className="text-xs leading-relaxed text-muted-foreground">Modern RAG (Retrieval-Augmented Generation) is enabled for all community-approved sources. Semantic indices are updated instantly upon approval.</p>
            </CardContent></Card>
          </div>
        </div>
      </motion.div>
    )
  }

  // --- Main Dashboard ---
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-[0_0_20px_rgba(0,242,254,0.3)]">
            <Shield className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Command Center</h1>
            <p className="text-sm text-muted-foreground">Platform control, content moderation, and real-time metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5 border-green-500/30 text-green-500">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" /> OPERATIONAL
          </Badge>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => fetchData()}><RefreshCcw className="size-3.5" /> Sync</Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Active Engineers', value: stats?.active_students?.toLocaleString() ?? '—', icon: Users, color: 'text-primary', bg: 'bg-primary/10', clickable: true, onClick: () => setSelectedView('users') },
          { label: 'AI Learning Tracks', value: String(stats?.total_courses_cached ?? '—'), icon: BookOpen, color: 'text-green-500', bg: 'bg-green-500/10', extra: '+12 Today' },
          { label: 'Pending Moderation', value: String(stats?.pending_reviews ?? contributions.length), icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', extra: 'TOP PRIORITY' },
          { label: 'AI Inference Latency', value: '142ms', icon: Activity, color: 'text-violet-500', bg: 'bg-violet-500/10', extra: '99.9% SLI', clickable: true, onClick: () => setSelectedView('database') },
        ].map((m, i) => (
          <motion.div key={i} whileHover={m.clickable ? { y: -2 } : undefined} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className={m.clickable ? 'premium-hover-card cursor-pointer transition-shadow hover:shadow-lg' : 'premium-hover-card'} onClick={m.onClick}>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className={`flex size-8 items-center justify-center rounded-lg ${m.bg}`}>
                    <m.icon className={`size-4 ${m.color}`} />
                  </div>
                  {m.extra && <span className={`text-xs font-bold ${m.color}`}>{m.extra}</span>}
                </div>
                <div className="font-heading text-2xl font-black text-foreground">{m.value}</div>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Moderation Queue */}
        <Card className="premium-hover-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                Moderation Queue <Badge variant="outline">{filteredContributions.length}</Badge>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search topic or user..." value={filter} onChange={e => setFilter(e.target.value)} className="h-8 w-52 pl-8 text-xs" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredContributions.length > 0 ? (
              <div className="space-y-3">
                {filteredContributions.map(c => (
                  <div key={c.id} className="overflow-hidden rounded-lg border">
                    <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{c.topic.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="text-sm font-bold">{c.topic.toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">By <span className="font-semibold text-foreground">{c.submitted_by}</span> · {new Date(c.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => handleReject(c.id)}><X className="size-3.5" /> Reject</Button>
                        <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(c.id)}><Check className="size-3.5" /> Approve</Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="rounded-lg border bg-muted/10 p-3 text-xs leading-relaxed text-muted-foreground">
                        {c.content ? <>{c.content.substring(0, 250)}...<span className="ml-1 cursor-pointer font-semibold text-primary">Review Full →</span></> : 'No semantic content detected.'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-12">
                <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10"><Check className="size-7 text-green-500" /></div>
                <h3 className="font-heading text-base font-bold">Queue Clean!</h3>
                <p className="text-sm text-muted-foreground">All contributions have been indexed.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel */}
        <div className="space-y-4">
          <Card className="premium-hover-card cursor-pointer" onClick={() => setSelectedView('database')}>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-3"><Database className="size-4 text-primary" /><span className="font-bold">Vector Index</span></div>
              <div className="mb-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">Health Check</span><span className="text-xs font-bold text-green-500">99.9% Sync</span></div>
              <Progress value={99.9} className="h-1.5" />
            </CardContent>
          </Card>
          <Card className="premium-hover-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-3"><Activity className="size-4 text-violet-500" /><span className="font-bold">Traffic surge</span></div>
              <div className="flex h-16 items-end gap-1">
                {[20, 40, 30, 60, 80, 50, 70, 90, 40, 60].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-violet-500/30" style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">Traffic intensity (Last 12 Hours)</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
