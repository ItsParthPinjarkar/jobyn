import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useResume } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'
import {
  getCodingProblems, getCodingProblem, submitCodeSolution, traceCode,
  type CodingProblem, type SubmissionResult, type TraceResult as SandboxTraceResult,
} from '../api/client'
import { awardXP } from '../utils/streakTracker'
import AuthRequiredPrompt from '../components/AuthRequiredPrompt'
import CodeEditor from '../components/CodeEditor'
import ProblemCard from '../components/ProblemCard'
import TestRunner from '../components/TestRunner'
import CodeVisualizer from '../components/CodeVisualizer'
import {
  Code, ArrowLeft, Play, Send, Loader2, XCircle, Tag, Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
}

const LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'go'] as const
type Language = typeof LANGUAGES[number]

function mapStatus(backend: string): string {
  const map: Record<string, string> = {
    accepted: 'Accepted',
    wrong_answer: 'Wrong Answer',
    runtime_error: 'Runtime Error',
    time_limit: 'Time Limit Exceeded',
    compile_error: 'Compile Error',
  }
  return map[backend] ?? backend
}

export default function CodingPractice() {
  const navigate = useNavigate()
  const { analysis } = useResume()
  const { user } = useAuth()

  const [problems, setProblems] = useState<CodingProblem[]>([])
  const [problemsLoading, setProblemsLoading] = useState(false)
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null)
  const [problemLoading, setProblemLoading] = useState(false)
  const [difficulty, setDifficulty] = useState<string>('all')
  const [language, setLanguage] = useState<Language>('python')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [error, setError] = useState('')
  const [visualizerData, setVisualizerData] = useState<SandboxTraceResult | null>(null)
  const [visualizing, setVisualizing] = useState(false)

  // Fetch problems
  useEffect(() => {
    if (!analysis) return
    const ctl = new AbortController()
    setProblemsLoading(true)
    const params = difficulty !== 'all' ? { difficulty } : undefined
    getCodingProblems(params)
      .then(data => { if (!ctl.signal.aborted) setProblems(data.problems) })
      .catch(() => {})
      .finally(() => { if (!ctl.signal.aborted) setProblemsLoading(false) })
    return () => ctl.abort()
  }, [analysis, difficulty])

  // Load problem detail
  const handleSelectProblem = useCallback(async (slug: string) => {
    setProblemLoading(true); setError(''); setResult(null)
    try {
      const problem = await getCodingProblem(slug)
      setSelectedProblem(problem)
      // Set starter code for the selected language
      const starter = problem.starter_code?.[language] || problem.starter_code?.python || ''
      setCode(starter)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load problem')
    } finally {
      setProblemLoading(false)
    }
  }, [language])

  // Update starter code when language changes
  useEffect(() => {
    if (selectedProblem) {
      const starter = selectedProblem.starter_code?.[language] || ''
      setCode(starter)
      setResult(null)
    }
  }, [language, selectedProblem])

  const handleSubmit = useCallback(async () => {
    if (!selectedProblem || !code.trim()) return
    setSubmitting(true); setError(''); setResult(null)
    try {
      const data = await submitCodeSolution(selectedProblem.id, language, code)
      setResult(data)
      // Award XP on accepted
      if (data.status === 'accepted' || data.passed === data.total) {
        const email = user?.email
        awardXP('project_verified', email, `coding-${selectedProblem.slug}`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }, [selectedProblem, language, code, user?.email])

  const handleRun = useCallback(async () => {
    if (!selectedProblem || !code.trim()) return
    setSubmitting(true); setError(''); setResult(null)
    try {
      const data = await submitCodeSolution(selectedProblem.id, language, code)
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setSubmitting(false)
    }
  }, [selectedProblem, language, code])

  const handleVisualize = useCallback(async () => {
    if (!code.trim()) return
    setVisualizing(true); setError('')
    try {
      const data = await traceCode(code, language)
      if (data.error) {
        setError(data.error)
      } else {
        setVisualizerData(data)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Visualization failed')
    } finally {
      setVisualizing(false)
    }
  }, [language, code])

  // Locked state
  if (!user) {
    return <AuthRequiredPrompt feature="Coding Practice" />
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Code className="size-7 text-primary" />
        </div>
        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          Coding Practice
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          Upload and analyze your resume first to access coding problems tailored to your skill gaps.
        </p>
        <Button size="lg" className="mt-6 gap-2" onClick={() => navigate('/resume-analyzer')}>
          <Code className="size-4" /> Analyze Resume First
        </Button>
      </div>
    )
  }

  // Problem Detail View
  if (selectedProblem) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Back Button */}
        <motion.div variants={item}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => { setSelectedProblem(null); setResult(null); setCode('') }}
          >
            <ArrowLeft className="size-3" /> Back to Problems
          </Button>
        </motion.div>

        {/* Problem Header */}
        <motion.div variants={item}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {selectedProblem.title}
                </h1>
                <Badge variant={selectedProblem.difficulty === 'Easy' ? 'secondary' : selectedProblem.difficulty === 'Hard' ? 'destructive' : 'outline'} className="text-xs">
                  {selectedProblem.difficulty}
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {selectedProblem.skill_tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] gap-1">
                    <Tag className="size-2.5" /> {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Split Layout */}
        <motion.div variants={item} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left: Problem Description */}
          <Card className="premium-hover-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Problem Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground">
                <p>{selectedProblem.description}</p>
              </div>

              {/* Example */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example</div>
                <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs">
                  <div><span className="text-muted-foreground">Input:</span> {selectedProblem.example_input}</div>
                  <div className="mt-1"><span className="text-muted-foreground">Output:</span> {selectedProblem.example_output}</div>
                </div>
                {selectedProblem.explanation && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold">Explanation:</span> {selectedProblem.explanation}
                  </div>
                )}
              </div>

              {/* Constraints */}
              {selectedProblem.constraints && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Constraints</div>
                  <div className="text-xs text-foreground">{selectedProblem.constraints}</div>
                </div>
              )}

              {/* Hints */}
              {selectedProblem.hints.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hints</div>
                  {selectedProblem.hints.map((hint, i) => (
                    <details key={i} className="group">
                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                        Hint {i + 1}
                      </summary>
                      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                    </details>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Code Editor */}
          <div className="space-y-4">
            <Card className="premium-hover-card">
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Solution</CardTitle>
                <Select value={language} onValueChange={v => setLanguage(v as Language)}>
                  <SelectTrigger size="sm" className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang} value={lang}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <CodeEditor
                  value={code}
                  onChange={v => setCode(v ?? '')}
                  language={language}
                  height="350px"
                />
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="gap-1.5" onClick={handleRun} disabled={submitting || !code.trim()}>
                    {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                    Run Tests
                  </Button>
                  <Button variant="outline" className="gap-1.5" onClick={handleVisualize} disabled={visualizing || !code.trim()}>
                    {visualizing ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                    Visualize
                  </Button>
                  <Button className="gap-1.5" onClick={handleSubmit} disabled={submitting || !code.trim()}>
                    {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    Submit
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            {result && (
              <Card className={`premium-hover-card ${result.status === 'accepted' ? 'border-success/30' : 'border-destructive/30'}`}>
                <CardContent className="pt-6">
                  <TestRunner results={result.test_results} status={mapStatus(result.status)} />
                  {result.status === 'accepted' && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/5 border border-success/10 px-3 py-2 text-xs text-success font-medium">
                      +200 XP earned for solving this problem!
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
                <XCircle className="size-4 shrink-0" /> {error}
              </div>
            )}
          </div>
        </motion.div>

        {/* Code Visualizer Modal */}
        {visualizerData && (
          <CodeVisualizer
            code={code}
            language={language}
            steps={visualizerData.steps}
            onClose={() => setVisualizerData(null)}
          />
        )}
      </motion.div>
    )
  }

  // Problem List View
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <Badge variant="outline" className="gap-1.5 border-primary/20 text-[11px] uppercase tracking-wider">
          <Code className="size-3" /> Practice Arena
        </Badge>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Coding <span className="gradient-text">Practice</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solve problems tailored to your skill gaps. Earn XP for each accepted solution.
        </p>
      </motion.div>

      {/* Difficulty Filter */}
      <motion.div variants={item}>
        <Tabs value={difficulty} onValueChange={setDifficulty}>
          <TabsList variant="line">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="easy" className="text-xs">Easy</TabsTrigger>
            <TabsTrigger value="medium" className="text-xs">Medium</TabsTrigger>
            <TabsTrigger value="hard" className="text-xs">Hard</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Problem Grid */}
      <motion.div variants={item}>
        {problemsLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : problems.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map(problem => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onClick={() => handleSelectProblem(problem.slug)}
              />
            ))}
          </div>
        ) : (
          <Card className="premium-hover-card">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Code className="size-8" />
              <p className="text-sm">No problems found for this filter.</p>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDifficulty('all')}>
                Show All Problems
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  )
}
