import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Blocks, Trash2, Copy, Check, Download, ChevronDown, ChevronUp,
  PlayCircle, ShieldCheck, ShieldAlert, ShieldX, Bookmark, FolderOpen,
  Search, Filter, Github,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DOMPurify from 'dompurify'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { markChecklistItem } from '../utils/onboardingChecklist'
import type { VerificationResult } from '../api/client'
import {
  getSavedProjects, updateProjectStatus, deleteProject, saveVerification,
  type SavedProject, type ProjectStatus,
} from '../utils/savedProjects'
import ProjectVerifier from '../components/ProjectVerifier'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string; Icon: typeof Bookmark }> = {
  saved:          { label: 'Saved',        color: 'text-blue-500',   bg: 'bg-blue-500/10',   Icon: Bookmark },
  'in-progress':  { label: 'In Progress',  color: 'text-amber-500', bg: 'bg-amber-500/10',   Icon: PlayCircle },
  verified:       { label: 'Verified',     color: 'text-green-500',  bg: 'bg-green-500/10',    Icon: ShieldCheck },
  partial:        { label: 'Partial',      color: 'text-amber-500', bg: 'bg-amber-500/10',   Icon: ShieldAlert },
  insufficient:   { label: 'Needs Work',   color: 'text-destructive',    bg: 'bg-destructive/10',    Icon: ShieldX },
}

const FILTER_KEYS: Array<{ key: ProjectStatus | 'all'; label: string; color: string; bg: string }> = [
  { key: 'all',         label: 'Total',       color: 'text-foreground',    bg: 'bg-card' },
  { key: 'saved',       label: 'Saved',       color: 'text-blue-500',      bg: 'bg-blue-500/8' },
  { key: 'in-progress', label: 'In Progress', color: 'text-amber-500',     bg: 'bg-amber-500/8' },
  { key: 'verified',    label: 'Verified',    color: 'text-green-500',     bg: 'bg-green-500/8' },
]

export default function MyProjects() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [verifyOpen, setVerifyOpen] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const reload = () => setProjects(getSavedProjects(user?.email))
  useEffect(reload, [user?.email])

  const filtered = projects.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return p.role.toLowerCase().includes(q) || p.skills.some(s => s.toLowerCase().includes(q))
    }
    return true
  })

  const counts: Record<string, number> = {
    all: projects.length,
    saved: projects.filter(p => p.status === 'saved').length,
    'in-progress': projects.filter(p => p.status === 'in-progress').length,
    verified: projects.filter(p => p.status === 'verified').length,
  }

  const handleStartProject = (id: string) => { updateProjectStatus(id, 'in-progress', user?.email); reload() }
  const handleVerified = (id: string, githubUrl: string, result: VerificationResult) => {
    saveVerification(id, githubUrl, result, user?.email)
    markChecklistItem('generated_project', user?.email)
    reload()
  }
  const handleDelete = (id: string) => { deleteProject(id, user?.email); if (expanded === id) setExpanded(null); if (verifyOpen === id) setVerifyOpen(null); reload() }
  const handleCopy = (id: string, markdown: string) => { navigator.clipboard.writeText(markdown).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000) }) }
  const handleDownload = (p: SavedProject) => { const blob = new Blob([p.markdown], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${p.role.replace(/\s+/g, '-').toLowerCase()}-capstone-project.md`; a.click(); URL.revokeObjectURL(url) }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary">
          <Blocks className="size-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">My Projects</h1>
          <p className="text-xs text-muted-foreground">Build projects, push to GitHub, then verify with AI</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {FILTER_KEYS.map(({ key, label, color, bg }) => (
          <button type="button" key={key} onClick={() => setFilterStatus(key)}
            className={`rounded-lg border p-3 text-center transition-all ${bg} ${filterStatus === key ? `border-${color.replace('text-', '')}/50 ring-1 ring-${color.replace('text-', '')}/20` : 'border-border'}`}
          >
            <div className={`text-2xl font-bold ${color}`}>{counts[key as keyof typeof counts] ?? 0}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </button>
        ))}
      </div>

      {/* How it works */}
      <Card className="premium-hover-card border-primary/10 bg-primary/5">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">How verification works:</span>
          {['Save a project', 'Build & push to GitHub', 'Submit repo URL for AI verification'].map((step, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              {step}
              {i < 2 && <span className="text-border">→</span>}
            </span>
          ))}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by role or skill..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <Card className="premium-hover-card">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <FolderOpen className="size-12 text-muted-foreground" strokeWidth={1.5} />
            <div className="text-center">
              <h3 className="font-heading text-base font-bold">No saved projects yet</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Add a project by generating a capstone from the <strong>Skill Gap</strong> or <strong>Improvement Plan</strong> page, then click "Save to My Projects" to track it here.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => navigate('/skill-gap')} className="gap-1.5">
                <Blocks className="size-4" /> Generate from Skill Gap
              </Button>
              <Button variant="outline" onClick={() => navigate('/improvement-plan')} className="gap-1.5">
                <FolderOpen className="size-4" /> Generate from Improvement Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map(p => {
            const meta = STATUS_META[p.status]
            const isOpen = expanded === p.id
            const isVerifyOpen = verifyOpen === p.id
            const hasVerification = !!p.verification
            const verScore = p.verification?.overall_score

            return (
              <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Card className="premium-hover-card overflow-hidden">
                  {/* Card header */}
                  <div className="cursor-pointer p-4" onClick={() => setExpanded(isOpen ? null : p.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={`gap-1 ${meta.color} border-current/30`}>
                            <meta.Icon className="size-3" />
                            {meta.label}
                          </Badge>
                          {hasVerification && (
                            <Badge variant="outline" className={verScore! >= 75 ? 'text-green-500' : verScore! >= 50 ? 'text-amber-500' : 'text-destructive'}>
                              Score: {verScore}/100
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{new Date(p.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <h3 className="font-heading text-base font-bold text-foreground">{p.role}</h3>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {p.skills.map(s => (
                            <Badge key={s} variant="outline" className="text-[11px]">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="mt-1 shrink-0 text-muted-foreground">
                        {isOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        {/* Workflow bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border bg-muted/30 px-4 py-2.5">
                          {p.status === 'saved' && (
                            <Button size="sm" onClick={() => handleStartProject(p.id)} className="gap-1.5">
                              <PlayCircle className="size-4" /> Mark as Started
                            </Button>
                          )}
                          {p.status === 'in-progress' && !isVerifyOpen && (
                            <Button size="sm" onClick={() => setVerifyOpen(p.id)} className="gap-1.5">
                              <Github className="size-4" /> Submit for Verification
                            </Button>
                          )}
                          {(p.status === 'verified' || p.status === 'partial' || p.status === 'insufficient') && (
                            <div className="flex items-center gap-2">
                              {p.githubUrl && (
                                <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
                                    <Github className="size-3.5" /> View Repo
                                  </a>
                              )}
                              <Button variant="outline" size="sm" onClick={() => setVerifyOpen(isVerifyOpen ? null : p.id)} className="gap-1.5">
                                <ShieldCheck className="size-3.5" /> {isVerifyOpen ? 'Hide Report' : 'View Report'}
                              </Button>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {p.status === 'saved' && '→ Start building, then submit your GitHub repo'}
                            {p.status === 'in-progress' && '→ Done coding? Submit your repo link below'}
                            {p.status === 'verified' && `✓ Verified on ${new Date(p.verifiedAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                            {p.status === 'partial' && '→ Address improvements and re-verify'}
                            {p.status === 'insufficient' && '→ Keep building! Re-verify later'}
                          </span>
                        </div>

                        {/* Verification panel */}
                        {isVerifyOpen && (
                          <div className="border-b border-border">
                            <ProjectVerifier project={p} onVerified={(url, result) => handleVerified(p.id, url, result)} />
                          </div>
                        )}

                        {/* Markdown body */}
                        <div className="prose prose-invert max-w-none p-4 text-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{DOMPurify.sanitize(p.markdown)}</ReactMarkdown>
                        </div>

                        {/* Action bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleCopy(p.id, p.markdown)} className="gap-1.5">
                              {copied === p.id ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                              {copied === p.id ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDownload(p)} className="gap-1.5">
                              <Download className="size-3.5" /> Download
                            </Button>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(p.id)} className="gap-1.5 text-destructive hover:text-destructive">
                            <Trash2 className="size-3.5" /> Remove
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Filtered empty */}
      {projects.length > 0 && filtered.length === 0 && (
        <Card className="premium-hover-card">
          <CardContent className="flex flex-col items-center gap-2 py-10">
            <Filter className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No projects match the current filter.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
