import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useResume } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'
import { getCompanyList, getCompanyPrep, type CompanyListItem, type CompanyPrep as CompanyPrepType } from '../api/client'
import AuthRequiredPrompt from '../components/AuthRequiredPrompt'
import CircularProgress from '../components/CircularProgress'
import {
  Briefcase, ArrowRight, CheckCircle, AlertTriangle, ExternalLink, BookOpen, Building2, Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
}

const CATEGORY_FILTERS = ['All', 'Product', 'Service', 'Startup'] as const

export default function CompanyPrep() {
  const navigate = useNavigate()
  const { analysis } = useResume()
  const { user } = useAuth()

  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [prep, setPrep] = useState<CompanyPrepType | null>(null)
  const [prepLoading, setPrepLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('All')

  // Fetch company list
  useEffect(() => {
    if (!analysis) return
    const ctl = new AbortController()
    setCompaniesLoading(true)
    getCompanyList()
      .then(data => { if (!ctl.signal.aborted) setCompanies(data) })
      .catch(() => {})
      .finally(() => { if (!ctl.signal.aborted) setCompaniesLoading(false) })
    return () => ctl.abort()
  }, [analysis])

  // Fetch company prep when selected
  useEffect(() => {
    if (!selectedSlug) { setPrep(null); return }
    const ctl = new AbortController()
    setPrepLoading(true); setError('')
    getCompanyPrep(selectedSlug)
      .then(data => { if (!ctl.signal.aborted) setPrep(data) })
      .catch(e => { if (!ctl.signal.aborted) setError(e instanceof Error ? e.message : 'Failed to load company data') })
      .finally(() => { if (!ctl.signal.aborted) setPrepLoading(false) })
    return () => ctl.abort()
  }, [selectedSlug])

  const filteredCompanies = filter === 'All'
    ? companies
    : companies.filter(c => c.category.toLowerCase() === filter.toLowerCase())

  // Locked state
  if (!user) {
    return <AuthRequiredPrompt feature="Company Prep" />
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Briefcase className="size-7 text-primary" />
        </div>
        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          Company Prep
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          Upload and analyze your resume first to get company-specific interview preparation.
        </p>
        <Button size="lg" className="mt-6 gap-2" onClick={() => navigate('/resume-analyzer')}>
          <Briefcase className="size-4" /> Analyze Resume First
        </Button>
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <Badge variant="outline" className="gap-1.5 border-primary/20 text-[11px] uppercase tracking-wider">
          <Building2 className="size-3" /> Company Intelligence
        </Badge>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Company <span className="gradient-text">Prep</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a company to see how your skills match their requirements and get interview preparation tips.
        </p>
      </motion.div>

      {/* Company Selector */}
      {!selectedSlug && (
        <motion.div variants={item}>
          <Card className="premium-hover-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Select a Company</CardTitle>
                  <CardDescription>{companies.length} companies available</CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <Filter className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Filter:</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter Tabs */}
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList variant="line">
                  {CATEGORY_FILTERS.map(cat => (
                    <TabsTrigger key={cat} value={cat} className="text-xs">
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Company Grid */}
              {companiesLoading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />
                  ))}
                </div>
              ) : filteredCompanies.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCompanies.map(company => (
                    <button
                      key={company.company_slug}
                      type="button"
                      className="group flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3.5 text-left transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
                      onClick={() => setSelectedSlug(company.company_slug)}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary transition-colors group-hover:bg-primary/20">
                        {company.company_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">{company.company_name}</div>
                        <Badge variant="outline" className="mt-0.5 text-[10px] capitalize">
                          {company.category}
                        </Badge>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Building2 className="size-8" />
                  <p className="text-sm">No companies found for this filter.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Back Button */}
      {selectedSlug && (
        <motion.div variants={item}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => { setSelectedSlug(null); setPrep(null); setError('') }}
          >
            <ArrowRight className="size-3 rotate-180" /> Back to Companies
          </Button>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div variants={item} className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" /> {error}
        </motion.div>
      )}

      {/* Loading */}
      {prepLoading && (
        <motion.div variants={item}>
          <Card className="premium-hover-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">Loading company preparation data...</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Prep Results */}
      {prep && !prepLoading && (
        <>
          {/* Match Overview */}
          <motion.div variants={item}>
            <Card className="premium-hover-card relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-violet/5">
              <CardContent className="flex flex-col items-center py-8 sm:flex-row sm:items-center sm:gap-8">
                <CircularProgress
                  pct={prep.user_match.coverage_pct}
                  size={130}
                  stroke={12}
                  label="Coverage"
                />
                <div className="mt-4 flex-1 text-center sm:mt-0 sm:text-left">
                  <h2 className="font-heading text-xl font-bold text-foreground">{prep.company_name}</h2>
                  <Badge variant="outline" className="mt-1 capitalize text-xs">{prep.category}</Badge>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {prep.user_match.coverage_pct >= 75
                      ? 'Excellent coverage! You are well-prepared for this company.'
                      : prep.user_match.coverage_pct >= 50
                      ? 'Good foundation. Focus on the gaps below to improve your chances.'
                      : 'Significant gaps exist. Prioritize the missing skills before applying.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Skills */}
          <motion.div variants={item} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Matched Required */}
            <Card className="premium-hover-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-success" />
                  <CardTitle className="text-base">Matched Required Skills</CardTitle>
                </div>
                <CardDescription>{prep.user_match.matched_required.length} of {prep.required_skills.length} covered</CardDescription>
              </CardHeader>
              <CardContent>
                {prep.user_match.matched_required.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {prep.user_match.matched_required.map(s => (
                      <Badge key={s} variant="outline" className="border-success/30 bg-success/5 text-success text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No required skills matched yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Missing Required */}
            <Card className="premium-hover-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-warning" />
                  <CardTitle className="text-base">Missing Required Skills</CardTitle>
                </div>
                <CardDescription>{prep.user_match.gap_required.length} skills to develop</CardDescription>
              </CardHeader>
              <CardContent>
                {prep.user_match.gap_required.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {prep.user_match.gap_required.map(s => (
                      <Badge
                        key={s}
                        variant="destructive"
                        className="text-xs cursor-pointer hover:opacity-80"
                        onClick={() => navigate('/improvement-plan', { state: { highlightSkill: s } })}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">All required skills covered!</p>
                )}
                {prep.user_match.gap_required.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 gap-1.5 text-xs"
                    onClick={() => navigate('/improvement-plan', { state: { highlightSkill: prep.user_match.gap_required[0] } })}
                  >
                    <BookOpen className="size-3" /> Study Missing Skills
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Interview Stages */}
          {prep.interview_stages.length > 0 && (
            <motion.div variants={item}>
              <Card className="premium-hover-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base">Interview Stages</CardTitle>
                  </div>
                  <CardDescription>What to expect in the hiring process</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {prep.interview_stages.map((stage, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-foreground">{stage.stage}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{stage.focus}</div>
                        </div>
                        {stage.duration && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {stage.duration}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Resources */}
          {prep.resources.length > 0 && (
            <motion.div variants={item}>
              <Card className="premium-hover-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base">Preparation Resources</CardTitle>
                  </div>
                  <CardDescription>Recommended materials for your prep</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {prep.resources.map((res, i) => (
                      <a
                        key={i}
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3.5 py-3 transition-all hover:border-primary/30 hover:bg-primary/5"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <ExternalLink className="size-3.5 text-primary" />
                        </div>
                        <span className="flex-1 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {res.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tips */}
          {prep.tips.length > 0 && (
            <motion.div variants={item}>
              <Card className="premium-hover-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-accent" />
                    <CardTitle className="text-base">Interview Tips</CardTitle>
                  </div>
                  <CardDescription>Company-specific advice from our analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {prep.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/30 px-3.5 py-2.5">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed text-foreground">{tip}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  )
}
