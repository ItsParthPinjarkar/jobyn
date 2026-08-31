import { Link } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, CheckCircle2, Play, Github, FileText, Award, ArrowUpRight,
  ShieldCheck, Database, Layers, Network, Star, Briefcase, TrendingUp, Target, Lock, Mic, Plus
} from 'lucide-react'
import LogoMark from '../components/LogoMark'
import ResumeScanVisual from '../components/landing/ResumeScanVisual'
import HeroVideo from '../components/landing/HeroVideo'
import JsonLd from '../components/JsonLd'
import SEO from '../components/SEO'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useResume } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'

/* ─── Data ──────────────────────────────────────────────────── */

const STEPS = [
  {
    step: '01',
    title: 'Resume Analysis',
    body: 'A 3-layer engine scores your resume against the role you want and locates structural gaps before a recruiter sees it.',
    fallbackMetric: '100% local parser',
    icon: FileText
  },
  {
    step: '02',
    title: 'Skill Gap Radar',
    body: 'Missing framework concepts are matched against live placement openings and ranked by real placement impact.',
    fallbackMetric: '12 paths supported',
    icon: Target
  },
  {
    step: '03',
    title: 'Interview Practice',
    body: 'A voice simulator grades your spoken systems-design answers on clarity, vocabulary, and conceptual accuracy.',
    fallbackMetric: 'Instant feedback',
    icon: Mic
  },
  {
    step: '04',
    title: 'Project Verification',
    body: 'Commit-footprint and complexity audits stamp verified authorship straight onto your student profile.',
    fallbackMetric: 'GitHub audit',
    icon: Github
  }
]

const SPEECH_SCENARIOS = [
  {
    role: 'Backend SDE',
    question: 'How do you prevent database race conditions during concurrent account balance updates?',
    response: 'We enforce optimistic concurrency control using a version field, immediately aborting transactions attempting updates on stale rows and falling back to a queuing model for high-contention accounts.',
    precision: '96% Score',
    skills: ['Optimistic Concurrency', 'FIFO Queues', 'Transaction Isolation']
  },
  {
    role: 'Frontend Systems',
    question: 'Describe how structural reconciliation cycles update nested layouts efficiently.',
    response: 'The virtual diffing engine assigns stable key parameters to layout elements, bypassing full-tree DOM recalculation by only applying modifications to nodes whose content has mutated.',
    precision: '98% Score',
    skills: ['Reconciliation Keying', 'DOM Diffing', 'Fiber Architecture']
  },
  {
    role: 'Systems & Infrastructure',
    question: 'Explain the mechanism vertical pod autoscalers utilize to adjust CPU and memory footprints.',
    response: 'Metric collector agents track real-time container resource utilization, feeding back to control loops that dynamically scale container configurations without causing pod crashes.',
    precision: '94% Score',
    skills: ['Metric Collection', 'Dynamic Scaling', 'OOM Prevention']
  }
]

const COMPANY_PIPELINES = [
  { company: 'Stripe', role: 'Backend Engineer', applicantCount: 42, status: 'Auditing Profiles', color: 'bg-emerald-500' },
  { company: 'Vercel', role: 'Frontend Architect', applicantCount: 18, status: 'Speech Arena Prep', color: 'bg-amber-500' },
  { company: 'Airbnb', role: 'Systems SDE', applicantCount: 29, status: 'Originality Check', color: 'bg-primary' }
]

const SKILL_DOMAINS = [
  {
    id: 'frontend',
    title: 'Frontend Architecture',
    desc: 'Verify web performance engineering and dynamic UI reconciliation capability.',
    icon: Layers,
    demand: '94%',
    advantage: '+18% placement rate',
    skills: ['Virtual DOM Diffing', 'Fiber Engine reconciliation', 'Hydration heuristics', 'Analytical bundle audits']
  },
  {
    id: 'backend',
    title: 'High-Performance Backend',
    desc: 'Validate database isolation levels, lock mechanics, and parallel processing.',
    icon: Network,
    demand: '98%',
    advantage: '+24% placement rate',
    skills: ['Optimistic Concurrency (OCC)', 'FIFO Message Queues', 'Distributed 2PC transactions', 'JSON Web Signatures']
  },
  {
    id: 'infra',
    title: 'Infrastructure & SRE',
    desc: 'Ensure automated pod scaling, metrics auditing, and reliable gateways.',
    icon: ShieldCheck,
    demand: '91%',
    advantage: '+15% placement rate',
    skills: ['Horizontal Pod Autoscalers', 'Terraform IaC blueprints', 'Container ingress logic', 'Redis rate-limiting']
  },
  {
    id: 'data',
    title: 'Data Systems Engineering',
    desc: 'Check indexing layout, schema structure, and analytical flow alignment.',
    icon: Database,
    demand: '89%',
    advantage: '+12% placement rate',
    skills: ['B-Tree Indexing optimizations', 'Change Data Capture (CDC)', 'Normalization normal forms', 'Kafka event processing']
  }
]

const TECH_LOGOS = ['react', 'typescript', 'python', 'nodedotjs', 'kubernetes', 'postgresql', 'redis', 'docker', 'graphql', 'terraform']

const FAQS = [
  { q: 'How does Jobyn analyze my resume?', a: 'Jobyn uses a 3-layer analysis engine combining deterministic scoring, ML inference trained on 57,100 real resumes, and generative AI for personalized feedback. In privacy mode your resume is processed on-device and never leaves your browser.' },
  { q: 'How is Jobyn different from other AI career tools?', a: 'Jobyn is built specifically for engineering students preparing for campus placement — not general professionals. Three things set it apart: (1) GitHub project verification that audits your actual commit history and code complexity, not a self-reported score; (2) a privacy mode that runs the analysis entirely on your device, so your resume never leaves your browser; and (3) ML trained on 57,100 real engineering resumes with 95% role-prediction accuracy. It measures and verifies readiness, rather than just generating text.' },
  { q: 'Is Jobyn free to use?', a: 'Yes. You can upload your resume, get a readiness score, identify skill gaps, and access study materials at no cost.' },
  { q: 'What career roles does Jobyn support?', a: 'Seven roles: Software Developer, Frontend Developer, Backend Developer, Full Stack Developer, Data Scientist, ML Engineer, and DevOps Engineer.' },
  { q: 'How accurate is the analysis?', a: 'Our ML model achieves 95% role-prediction accuracy and R2 = 0.992 for score prediction, trained on 57,100 real engineering resumes from the Indian job market.' },
  { q: 'Is my resume data private?', a: 'Yes. The on-device mode processes your resume entirely in your browser using ONNX WebAssembly, and we store zero resume content on our servers.' },
]

/* ─── Hero Readiness Gauge (real, on-brand product visual) ──── */

function ReadinessGauge({ score, role, skills, coverage }: { score: number; role: string; skills: number; coverage: number }) {
  const pct = Math.max(0, Math.min(100, score))
  const f = pct / 100
  const theta = Math.PI * (1 - f)
  const cx = 160, cy = 168, r = 132
  const dotX = cx + r * Math.cos(theta)
  const dotY = cy - r * Math.sin(theta)
  return (
    <div className="surface-card relative p-6 sm:p-8">
      <div className="flex items-center justify-end">
        <Badge variant="outline" className="rounded-full border-accent/20 bg-accent/5 text-accent text-[10px] font-bold">LIVE</Badge>
      </div>

      <svg viewBox="0 0 320 210" className="mx-auto w-full max-w-85" role="img" aria-label={`Readiness score ${pct} percent`}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#C2593F" />
            <stop offset="1" stopColor="#0F766E" />
          </linearGradient>
        </defs>
        <path d="M28 168 A132 132 0 0 1 292 168" fill="none" stroke="#EFE3D6" strokeWidth="22" strokeLinecap="round" />
        <motion.path
          d="M28 168 A132 132 0 0 1 292 168"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="22"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: f }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
        <motion.circle
          cx={dotX} cy={dotY} r="11" fill="#0F766E" stroke="#FAF8F5" strokeWidth="3"
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.5, type: 'spring', stiffness: 220, damping: 16 }}
        />
        <text x="160" y="158" textAnchor="middle" fontFamily="Clash Display, Satoshi, sans-serif" fontSize="58" fontWeight="700" fill="#1E1B18">{pct}<tspan fontSize="26" dy="-2">%</tspan></text>
        <text x="160" y="190" textAnchor="middle" fontFamily="Satoshi, sans-serif" fontSize="15" fontWeight="600" fill="#5C5650">Target: {role}</text>
      </svg>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="surface-inset px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Skills Detected</div>
          <div className="font-heading text-xl font-bold text-primary">{skills}</div>
        </div>
        <div className="surface-inset px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Core Coverage</div>
          <div className="font-heading text-xl font-bold text-accent">{coverage}%</div>
        </div>
      </div>
    </div>
  )
}

/* ─── Connected pipeline with an animated curved path ─────────── */

function PipelineFlow() {
  const reduce = useReducedMotion()
  // sine wave across a 1200x140 viewBox; nodes sit where it crosses the midline
  const W = 1200, mid = 70, amp = 44, period = 600, phase = 150
  let d = ''
  for (let x = 0; x <= W; x += 12) {
    const y = mid - amp * Math.sin((2 * Math.PI * (x - phase)) / period)
    d += x === 0 ? `M${x} ${y.toFixed(1)}` : ` L${x} ${y.toFixed(1)}`
  }
  const nodePct = [12.5, 37.5, 62.5, 87.5]

  return (
    <div className="relative mx-auto max-w-6xl px-6">
      {/* animated curved connector (desktop) */}
      <div className="relative -mb-6.5 hidden h-30 md:block">
        <svg viewBox="0 0 1200 140" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#C2593F" /><stop offset="1" stopColor="#0F766E" />
            </linearGradient>
            <radialGradient id="cometGrad">
              <stop offset="0" stopColor="#0F766E" stopOpacity="0.9" /><stop offset="1" stopColor="#0F766E" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d={d} fill="none" stroke="#EAD9C8" strokeWidth="3" />
          <motion.path
            d={d} fill="none" stroke="url(#flowGrad)" strokeWidth="3" strokeLinecap="round"
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          />
          {!reduce && (
            <>
              <circle r="14" fill="url(#cometGrad)"><animateMotion dur="7s" repeatCount="indefinite" path={d} /></circle>
              <circle r="4.5" fill="#0F766E"><animateMotion dur="7s" repeatCount="indefinite" path={d} /></circle>
            </>
          )}
        </svg>
        {nodePct.map((pct, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-white font-heading text-sm font-bold text-primary shadow-md"
            style={{ left: `${pct}%` }}
            initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.18, type: 'spring', stiffness: 220, damping: 16 }}
          >
            {STEPS[i].step}
          </motion.div>
        ))}
      </div>

      {/* stage cards */}
      <div className="grid gap-5 md:grid-cols-4">
        {STEPS.map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="surface-card premium-hover-card space-y-3 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="size-5" /></div>
                <span className="font-heading text-sm font-bold text-stone-300 md:hidden">{item.step}</span>
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">{item.title}</h3>
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">{item.body}</p>
              <div className="inline-flex items-center gap-1.5 rounded border border-accent/10 bg-accent/5 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
                {item.fallbackMetric}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Section heading helper ─────────────────────────────────── */

function SectionHeading({ eyebrow, title, sub, center }: { eyebrow?: string; title: string; sub?: string; center?: boolean }) {
  return (
    <div className={`max-w-2xl space-y-4 ${center ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <span className="text-[11px] font-bold uppercase tracking-widest text-primary/80">{eyebrow}</span>}
      <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {sub && <p className="text-base font-medium leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  )
}

/* ─── Main Landing Page ─────────────────────────────────────── */

export default function Landing() {
  const { analysis } = useResume()
  const { user } = useAuth()

  const [speechIdx, setSpeechIdx] = useState(0)
  const [activeDomainIdx, setActiveDomainIdx] = useState(0)
  const [outputText, setOutputText] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const reduce = useReducedMotion()

  const simIntervalRef = useRef<any>(null)

  useEffect(() => () => { if (simIntervalRef.current) clearInterval(simIntervalRef.current) }, [])

  const liveScore = useMemo(() => analysis?.final_score ?? 84, [analysis])
  const liveRole = useMemo(() => analysis?.role ?? 'Software Engineer', [analysis])
  const liveSkillsCount = useMemo(() => analysis?.detected_skills?.length ?? 12, [analysis])
  const liveCoverage = useMemo(() => analysis?.core_coverage_percent ?? 78, [analysis])

  const activeDomain = SKILL_DOMAINS[activeDomainIdx]
  const ActiveDomainIcon = activeDomain.icon

  const startVoiceSimulator = useCallback(() => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current)
    setIsSimulating(true)
    setOutputText('')
    const fullSpeech = SPEECH_SCENARIOS[speechIdx].response || ''
    let currentText = ''
    let charI = 0
    simIntervalRef.current = setInterval(() => {
      if (charI < fullSpeech.length) {
        currentText += fullSpeech.charAt(charI)
        setOutputText(currentText)
        charI++
      } else {
        if (simIntervalRef.current) { clearInterval(simIntervalRef.current); simIntervalRef.current = null }
        setIsSimulating(false)
      }
    }, 15)
  }, [speechIdx])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/10"
    >
      <SEO
        title="Jobyn — Resume Score & Placement Prep for Engineering Students"
        description="Jobyn scores your resume with ML trained on 57,100 real engineering resumes, verifies your GitHub projects, and preps you for placement — privately, on your device. Free to start."
        keywords="resume score, campus placement preparation, engineering student resume, skill gap analysis, github project verification, on-device resume analysis, mock interview practice"
      />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://getjobyn.pages.dev/#organization',
            name: 'Jobyn',
            url: 'https://getjobyn.pages.dev/',
            logo: 'https://getjobyn.pages.dev/logo.png'
          },
          {
            '@type': 'WebSite',
            '@id': 'https://getjobyn.pages.dev/#website',
            name: 'Jobyn',
            url: 'https://getjobyn.pages.dev/',
            publisher: { '@id': 'https://getjobyn.pages.dev/#organization' }
          }
        ]
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Jobyn',
        alternateName: 'Jobyn — Placement OS',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        description: 'AI career-readiness platform for engineering students: ML resume scoring, skill-gap detection, voice mock interviews, and GitHub project verification. Privacy-first, on-device analysis.',
        audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
        featureList: [
          'ML resume scoring trained on 57,100 real engineering resumes',
          'Skill-gap radar mapped to live openings',
          'Voice mock interviews with instant scoring',
          'GitHub commit-level project verification',
          'On-device privacy mode (resume never leaves your browser)'
        ],
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
      }} />

      {/* ── Header ───────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <div>
              <span className="font-heading text-sm font-bold tracking-tight text-foreground">Jobyn<sup className="text-[0.6em] font-semibold">™</sup></span>
              <span className="ml-1 text-xs font-semibold uppercase tracking-widest text-primary">OS</span>
            </div>
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            {[['#how-it-works', 'How it works'], ['#skills', 'Skill Matrix'], ['#speech', 'Speech Arena'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} className="group relative py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary">
                {label}
                <span className="absolute bottom-0 left-0 h-[1.5px] w-0 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <Link to="/signup" className={buttonVariants({ size: 'sm' }) + ' flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-semibold shadow-sm'}>
              Access Platform <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <Button variant="ghost" size="icon" className="text-foreground md:hidden" onClick={() => setMobileMenuOpen(v => !v)}>
            {mobileMenuOpen ? '✕' : '☰'}
          </Button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border bg-background md:hidden">
              <div className="flex flex-col gap-1.5 p-4">
                {[['#how-it-works', 'How it works'], ['#skills', 'Skill Matrix'], ['#speech', 'Speech Arena'], ['#faq', 'FAQ']].map(([href, label]) => (
                  <a key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-stone-100" onClick={() => setMobileMenuOpen(false)}>{label}</a>
                ))}
                <Link to="/signup" className={buttonVariants({ size: 'sm' }) + ' mt-2 flex w-full justify-center gap-1.5 text-center font-semibold'} onClick={() => setMobileMenuOpen(false)}>Access Platform <ArrowRight className="size-3.5" /></Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-aura relative overflow-hidden bg-background pt-16 pb-20 md:pt-20 md:pb-24">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-[-12%] top-[-30%] h-130 w-130 rounded-full bg-primary/5 blur-[140px]" />
          <div className="absolute right-[-18%] top-[40%] h-110 w-110 rounded-full bg-accent/5 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-7">
              <motion.span
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary"
              >
                <Award className="size-3.5" /> Placement Readiness for Engineering Students
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
                className="font-heading text-4xl font-light leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
              >
                57,100 resumes trained our AI. <span className="font-semibold italic text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">Here's what it learned about landing your placement.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
                className="max-w-xl text-base font-medium leading-relaxed text-muted-foreground md:text-lg"
              >
                Generic AI career tools give you text and a login wall. Jobyn gives engineering students a measured, tracked, verified roadmap — ML resume scoring, GitHub project proof, and mock interviews, all private to your device. See your gaps and close them before placement season.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-4 pt-1"
              >
                <Link to="/signup" className={buttonVariants({ size: 'lg' }) + ' gap-2 rounded-full px-8 py-6 text-sm font-semibold shadow-md'}>Get Your Resume Score</Link>
                <Link to="/quick-score" className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' rounded-full border-stone-200 bg-white px-8 py-6 text-sm font-semibold hover:bg-stone-50'}>Try Free — 30s Score</Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.5 }}
                className="flex flex-wrap gap-2.5 pt-1"
              >
                {['95% ML Accuracy', 'On-device Privacy', 'GitHub-Verified Projects', 'Free to Start'].map((label) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold text-accent">
                    <CheckCircle2 className="size-3" /> {label}
                  </span>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <HeroVideo />

              {/* Demo context card — fills the right column so the hero reads balanced */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
                className="mt-6 rounded-2xl border border-border bg-white/60 p-5 backdrop-blur-sm"
              >
                <div className="flex flex-wrap gap-2">
                  {['Readiness dashboard', 'Skill-gap graph', 'Live AI interview — 91%', 'GitHub verification'].map((chapter) => (
                    <span key={chapter} className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary">
                      <span className="size-1.5 rounded-full bg-primary" /> {chapter}
                    </span>
                  ))}
                </div>
                <p className="mt-3.5 text-sm font-medium leading-relaxed text-muted-foreground">
                  A 70-second walkthrough of the <span className="font-semibold text-foreground">real logged-in product</span> — no mockups, no signup needed to watch.
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { value: '57,100', label: 'Resumes trained on', icon: FileText },
              { value: '95%', label: 'ML role accuracy', icon: Layers },
              { value: '0.992', label: 'Score prediction R²', icon: TrendingUp },
              { value: '7', label: 'Career roles', icon: Briefcase },
            ].map((s) => (
              <div key={s.label} className="lift flex flex-col gap-1.5 rounded-2xl border border-border bg-white p-5">
                <s.icon className="size-5 text-primary" />
                <span className="font-heading text-2xl font-bold text-foreground">{s.value}</span>
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack logo wall (scrolling marquee) ─────────── */}
      <section className="overflow-hidden border-y border-border bg-white py-10">
        <p className="mb-7 px-6 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">We map your resume against the real engineering stack</p>
        <div className="relative overflow-hidden mask-[linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
          <motion.div
            className="flex w-max items-center gap-14"
            animate={reduce ? undefined : { x: ['-50%', '0%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          >
            {[...TECH_LOGOS, ...TECH_LOGOS].map((slug, i) => (
              <img key={`${slug}-${i}`} src={`https://cdn.simpleicons.org/${slug}/9a958f`} alt={slug} width={30} height={30} loading="lazy" className="h-7 w-7 shrink-0 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works (features + pipeline, merged) ───────── */}
      <section id="how-it-works" className="relative border-t border-border bg-[#F4EFEA]/70 py-20">
        <div className="mx-auto max-w-6xl space-y-14 px-6">
          <SectionHeading eyebrow="How it works" title="From resume to offer, one connected pipeline." sub="Not a chatbot that spits out text. Jobyn measures, tracks, and verifies your readiness end to end, privately on your device." center />

          {/* live product preview */}
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-5">
              <h3 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">See it on your own resume in 30 seconds.</h3>
              <p className="max-w-xl text-base font-medium leading-relaxed text-muted-foreground">Drop a PDF and the engine scores it against the role you want, surfaces your gaps, and turns them into an ordered roadmap. No signup, nothing stored.</p>
              <div className="flex flex-wrap gap-2.5">
                {['On-device privacy', 'No data stored', '95% ML accuracy'].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold text-accent"><Lock className="size-3" /> {t}</span>
                ))}
              </div>
              <Link to="/quick-score" className={buttonVariants({ size: 'lg' }) + ' gap-2 rounded-full px-8 py-6 text-sm font-semibold shadow-md'}>Try the live score <ArrowRight className="size-4" /></Link>
            </div>
            <ResumeScanVisual />
          </div>

          {/* four-stage connected pipeline */}
          <PipelineFlow />
        </div>
      </section>

      {/* ── Skill Matrix (interactive) ───────────────────────── */}
      <section id="skills" className="relative border-t border-border bg-white py-20">
        <div className="mx-auto max-w-6xl space-y-14 px-6">
          <SectionHeading eyebrow="Skill Matrix" title="Engineered for absolute placement fit." sub="Ditch superficial bullet points. Interactive diagnostics verify real engineering capabilities that match actual firm constraints." center />

          <div className="grid items-stretch gap-8 md:grid-cols-5">
            {/* domain selector */}
            <div className="space-y-3 md:col-span-2">
              {SKILL_DOMAINS.map((domain, index) => {
                const Icon = domain.icon
                const isActive = activeDomainIdx === index
                return (
                  <button
                    key={domain.id}
                    type="button"
                    aria-pressed={isActive}
                    className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${isActive ? 'lift border-primary/20 bg-white' : 'border-transparent bg-stone-50/70 hover:bg-stone-100/70'}`}
                    onClick={() => setActiveDomainIdx(index)}
                  >
                    {isActive && <motion.span layoutId="skill-active-bar" className="absolute inset-y-2 left-0 w-1 rounded-full bg-linear-to-b from-primary to-accent" />}
                    <div className={`shrink-0 rounded-xl p-2.5 transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'bg-white text-stone-400 group-hover:text-stone-600'}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground">{domain.title}</div>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-muted-foreground">{domain.desc}</p>
                    </div>
                    <span className={`shrink-0 font-heading text-sm font-bold ${isActive ? 'text-primary' : 'text-stone-300'}`}>{domain.demand}</span>
                  </button>
                )
              })}
            </div>

            {/* diagnostic panel */}
            <div className="md:col-span-3">
              <div className="lift relative h-full overflow-hidden rounded-2xl border border-stone-200 bg-white p-8">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/5 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-12 size-56 rounded-full bg-accent/5 blur-3xl" />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeDomain.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 flex h-full flex-col"
                  >
                    <div className="flex items-start gap-4 border-b border-stone-200/60 pb-6">
                      <div className="shrink-0 rounded-2xl bg-primary/10 p-3 text-primary"><ActiveDomainIcon className="size-6" /></div>
                      <div className="flex-1">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Verifying pathway gaps</span>
                        <h3 className="mt-0.5 font-heading text-2xl font-bold text-foreground">{activeDomain.title}</h3>
                      </div>
                    </div>

                    <div className="space-y-2 pt-6">
                      <div className="flex items-end justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Industry demand</span>
                        <span className="font-heading text-lg font-bold text-primary">{activeDomain.demand}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                        <motion.div className="h-full rounded-full bg-linear-to-r from-primary to-accent" initial={{ width: 0 }} animate={{ width: activeDomain.demand }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
                      </div>
                    </div>

                    <div className="space-y-3 pt-7">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Required architectural signatures</span>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {activeDomain.skills.map((subSkill, subIdx) => (
                          <motion.div
                            key={subSkill}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 + subIdx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-center gap-2.5 rounded-xl border border-stone-200/60 bg-stone-50 px-3.5 py-3 text-[13px] font-semibold text-foreground"
                          >
                            <CheckCircle2 className="size-4 shrink-0 text-accent" />{subSkill}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto flex flex-col items-start justify-between gap-4 border-t border-stone-200/60 pt-7 sm:flex-row sm:items-center">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Placement advantage</div>
                        <div className="mt-0.5 font-heading text-xl font-bold text-accent">{activeDomain.advantage}</div>
                      </div>
                      <Link to="/signup" className={buttonVariants({ size: 'sm' }) + ' gap-1.5 rounded-full px-5 py-4 text-xs font-bold'}>
                        Audit my {activeDomain.title.split(' ')[0]} skills <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Recruiter Sync ───────────────────────────────────── */}
      <section id="recruiters" className="relative border-t border-border bg-[#F4EFEA]/70 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-2">
          <div className="space-y-6">
            <SectionHeading eyebrow="Recruiter Sync" title="Direct pipeline to active placements." sub="Eliminate arbitrary agency screeners. Jobyn continuously syncs your verified profile milestones directly to partnering company applicant databases." />
            <div className="space-y-5 pt-1">
              {[
                { title: 'Live recruiter dashboard sync', desc: 'Partnering recruitment teams query student profile diagnostics in real-time.' },
                { title: 'Pathways match index', desc: 'Instantly highlights matching roles based on your verified skill metrics.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary"><CheckCircle2 className="size-3.5" /></div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{item.title}</div>
                    <div className="mt-1 text-[12px] font-medium leading-relaxed text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="lift relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 p-7"
          >
            <div className="mb-5 flex items-center justify-between border-b border-stone-200/60 pb-5">
              <div>
                <span className="text-xs font-bold uppercase text-stone-400">Live Workspace Footprint</span>
                <h4 className="mt-0.5 text-xs font-bold text-foreground">{user?.name ? `${user.name}'s Profile` : 'Active Auditor Profile'}</h4>
              </div>
              <Badge variant="outline" className="rounded-full border-primary/20 bg-white px-2.5 py-0.5 text-xs font-bold text-primary">CONNECTED</Badge>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-stone-200/60 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold uppercase text-stone-400">Readiness Score</div>
                <div className="mt-1 font-heading text-2xl font-bold text-primary">{liveScore}%</div>
                <div className="mt-0.5 text-xs font-semibold text-muted-foreground">Target: {liveRole}</div>
              </div>
              <div className="rounded-xl border border-stone-200/60 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold uppercase text-stone-400">Core Skills Map</div>
                <div className="mt-1 font-heading text-2xl font-bold text-accent">{liveSkillsCount} Detected</div>
                <div className="mt-0.5 text-xs font-semibold text-muted-foreground">{liveCoverage}% Core Coverage</div>
              </div>
            </div>
            <div className="space-y-3">
              {COMPANY_PIPELINES.map(pipe => (
                <div key={pipe.company} className="flex items-center justify-between rounded-xl border border-stone-200/60 bg-white px-4 py-3.5 shadow-sm">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">{pipe.company} <span className="text-xs font-medium text-stone-400">• {pipe.role}</span></div>
                    <div className="mt-0.5 text-xs font-medium text-muted-foreground">{pipe.applicantCount} candidates matched</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`size-1.5 rounded-full ${pipe.color}`} />
                    <span className="text-xs font-bold text-foreground">{pipe.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Speech Arena ─────────────────────────────────────── */}
      <section id="speech" className="relative border-t border-border bg-white py-20">
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-2">
          <div className="lift relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 p-7">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-4">
                <div className="flex gap-1.5">
                  <div className="size-2 rounded-full bg-[#FF5F56]" /><div className="size-2 rounded-full bg-[#FFBD2E]" /><div className="size-2 rounded-full bg-[#27C93F]" />
                </div>
                <span className="font-mono text-xs tracking-wider text-muted-foreground">vocal_arena_panel</span>
              </div>
              <div className="flex gap-1 rounded-xl bg-stone-200/50 p-1">
                {SPEECH_SCENARIOS.map((tab, idx) => (
                  <button
                    key={tab.role}
                    type="button"
                    className={`flex-1 rounded-lg py-2.5 text-center font-heading text-xs font-bold transition-all duration-150 ${speechIdx === idx ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => { if (simIntervalRef.current) { clearInterval(simIntervalRef.current); simIntervalRef.current = null } setSpeechIdx(idx); setOutputText(''); setIsSimulating(false) }}
                  >
                    {tab.role.split(' ')[0]}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Prompt</span>
                <div className="text-xs font-bold leading-relaxed text-foreground">{SPEECH_SCENARIOS[speechIdx].question}</div>
              </div>
              <div className="min-h-33.75 overflow-y-auto rounded-xl border border-stone-200 bg-white p-4">
                <p className="font-mono text-[11px] leading-relaxed text-foreground">{outputText || <span className="italic text-stone-400">Trigger vocal practice simulation below...</span>}</p>
              </div>
              <div className="flex items-center justify-between border-t border-stone-200/60 pt-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Lexical Index</div>
                  <div className="mt-0.5 font-heading text-lg font-bold text-primary">{SPEECH_SCENARIOS[speechIdx].precision}</div>
                </div>
                <div className="flex max-w-[65%] flex-wrap justify-end gap-1">
                  {SPEECH_SCENARIOS[speechIdx].skills.map(c => (
                    <Badge key={c} variant="outline" className="rounded-md border-accent/15 bg-accent/5 px-1.5 py-0.5 text-[8px] font-bold text-accent">{c}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="outline" className="w-full gap-2 rounded-xl border-stone-200 bg-white py-4.5 text-xs font-bold hover:bg-stone-50" onClick={startVoiceSimulator} disabled={isSimulating}>
                <Play className="size-3 fill-current text-primary" />{isSimulating ? 'Calibrating speech inputs...' : 'Simulate mock verbal response'}
              </Button>
            </div>
          </div>
          <div className="space-y-6">
            <SectionHeading eyebrow="Speech Arena" title="Perfect your technical articulation." sub="Improve verbal response flow in seconds. The Vocal Arena measures lexical keyword coverage, architectural keyphrases, and conceptual clarity to grade spoken interview solutions dynamically." />
          </div>
        </div>
      </section>

      {/* ── Attribution Audit ────────────────────────────────── */}
      <section id="attribution" className="relative border-t border-border bg-[#F4EFEA]/70 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-2">
          <div className="space-y-6">
            <SectionHeading eyebrow="Attribution Audit" title="Verify structural project authorship." sub="Stand out in recruitment boards. Jobyn registers codebase attributions, verifying commit signatures, build success logs, and complexity audits directly to your student credentials." />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="lift relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-7"
          >
            <div className="mb-4 flex items-center gap-2 border-b border-stone-200/60 pb-4">
              <Github className="size-4 text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground">git_attribution_audit</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Authorship signature verification', status: 'VERIFIED' },
                { label: 'Commit history footprint check', status: 'VERIFIED' },
                { label: 'Project complexity diagnostic', status: 'VERIFIED' },
                { label: 'Plagiarism scan attribution', status: 'CLEAN' }
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border border-stone-200/60 bg-stone-50 px-3.5 py-2.5">
                  <span className="text-[11px] font-semibold text-foreground">{item.label}</span>
                  <Badge variant="outline" className="rounded-md border-accent/15 bg-accent/5 px-1.5 py-0.5 text-[8px] font-bold text-accent">{item.status}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-stone-200/60 pt-4 text-xs font-bold text-accent">
              <CheckCircle2 className="size-4" /> ATTRIBUTION STAMP — verified codebase footprints mapped
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="relative border-t border-border bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading eyebrow="From beta testers" title="Students closing their gaps, fast." center />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { quote: 'The skill gap analysis alone saved me months of guessing what to learn. I went from 45% to 82% readiness in 3 weeks.', name: 'Priya Sharma', role: 'Final Year, Computer Science', rating: 5 },
              { quote: 'The interview simulator is brutally honest, exactly what I needed. My confidence during placement interviews shot up.', name: 'Arjun Mehta', role: 'Pre-Final Year, IT', rating: 5 },
              { quote: 'It maps my resume against actual job requirements. No other tool does this with such precision for Indian engineering students.', name: 'Sneha Patel', role: 'Final Year, ECE', rating: 4 },
            ].map((t) => (
              <Card key={t.name} className="lift premium-hover-card border-stone-200 bg-white">
                <CardContent className="pt-6">
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (<Star key={i} className={`size-3.5 ${i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />))}
                  </div>
                  <p className="mb-5 text-sm leading-relaxed text-muted-foreground">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">{t.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="relative border-t border-border bg-[#F4EFEA]/70 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading eyebrow="FAQ" title="Questions, answered." sub="Everything you need to know before you upload your first resume." />
          <div className="space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i
              return (
                <div key={i} className={`surface-card overflow-hidden ${open ? '' : ''}`}>
                  <button type="button" className="flex w-full items-center justify-between gap-4 p-5 text-left" onClick={() => setOpenFaq(open ? null : i)}>
                    <span className="text-sm font-bold text-foreground">{f.q}</span>
                    <Plus className={`size-4 shrink-0 text-primary transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <p className="px-5 pb-5 text-sm font-medium leading-relaxed text-muted-foreground">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={24} />
            <div>
              <div className="text-xs font-bold text-foreground">Jobyn™ OS</div>
              <div className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-stone-400">Continuous Placement Engine</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <a href="https://getjobyn.pages.dev" target="_blank" rel="noreferrer" className="flex items-center gap-1 transition-colors hover:text-primary">Live App <ArrowUpRight className="inline size-3" /></a>
            <a href="https://github.com/Ganesh-0509/Jobyn" target="_blank" rel="noreferrer" className="flex items-center gap-1 transition-colors hover:text-primary">GitHub <ArrowUpRight className="inline size-3" /></a>
            <Link to="/quick-score" className="flex items-center gap-1 transition-colors hover:text-primary">Free Resume Score <ArrowUpRight className="inline size-3" /></Link>
            <Link to="/blog" className="flex items-center gap-1 transition-colors hover:text-primary">Blog <ArrowUpRight className="inline size-3" /></Link>
            <Link to="/docs" className="flex items-center gap-1 transition-colors hover:text-primary">Docs <ArrowUpRight className="inline size-3" /></Link>
            <Link to="/privacy" className="flex items-center gap-1 transition-colors hover:text-primary">Privacy <ArrowUpRight className="inline size-3" /></Link>
          </div>
          <div className="text-xs font-medium text-stone-400">© 2026 Jobyn™ — built by Ganesh Kumar T</div>
        </div>
      </footer>
    </motion.div>
  )
}
