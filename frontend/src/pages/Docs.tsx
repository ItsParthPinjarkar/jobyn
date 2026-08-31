import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    ArrowLeft, Search, BookOpen, Terminal, Cpu, Shield,
    Info, AlertTriangle, Copy, Check
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import SEO from '../components/SEO'

interface DocSection {
    id: string
    title: string
    category: string
    icon: typeof BookOpen
    content: React.ReactNode
    toc: { id: string; text: string }[]
}

function CodeBlock({ title, children }: { title?: string; children: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = () => {
        navigator.clipboard.writeText(children)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <div className="rounded-lg border border-border/50 overflow-hidden mb-6">
            {title && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-border/50">
                    <span className="text-xs font-mono text-muted-foreground">{title}</span>
                    <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            )}
            <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-cyan/80 bg-[#090d1a]">
                {children}
            </pre>
        </div>
    )
}

function CodeTabs({ js, py }: { js: string; py: string }) {
    const [tab, setTab] = useState<'js' | 'py'>('js')
    return (
        <div className="rounded-lg border border-border/50 overflow-hidden mb-6">
            <div className="flex items-center gap-4 px-4 py-2.5 bg-white/[0.02] border-b border-border/50">
                {(['js', 'py'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            'text-xs font-mono font-medium transition-colors',
                            tab === t ? 'text-cyan' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {t === 'js' ? 'JavaScript' : 'Python'}
                    </button>
                ))}
            </div>
            <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-cyan/80 bg-[#090d1a]">
                {tab === 'js' ? js : py}
            </pre>
        </div>
    )
}

const docPages: DocSection[] = [
    {
        id: 'intro',
        title: 'Welcome to Jobyn',
        category: 'Getting Started',
        icon: BookOpen,
        toc: [
            { id: 'overview', text: 'Overview' },
            { id: 'why-edge', text: 'Why Edge Intelligence?' },
            { id: 'loop', text: 'The Growth Loop Metaphor' }
        ],
        content: (
            <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-[family-name:var(--font-heading)]">
                    Welcome to Jobyn
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Jobyn is a state-of-the-art career readiness intelligence engine designed to align academic curriculum and engineering student portfolios directly with live industry benchmarks. By leveraging on-device machine learning, the system acts as a real-time advisor for technical skill building.
                </p>

                <Card className="bg-cyan/5 border-cyan/15 mb-8">
                    <CardContent className="p-4 flex gap-3">
                        <Info className="h-5 w-5 text-cyan shrink-0 mt-0.5" />
                        <div>
                            <strong className="block text-sm text-foreground mb-1">Fast Track Guidance</strong>
                            <span className="text-xs text-muted-foreground leading-relaxed">
                                If you are a new developer or student setting up the system for the first time, skip directly to the <span className="text-cyan font-semibold cursor-pointer">Quickstart Guide</span> to spin up the local server in under 2 minutes.
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <h2 id="overview" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    Overview
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    Traditional career portals rely on heavy relational structures that store sensitive student telemetry in third-party cloud databases. Jobyn introduces a peerless <strong className="text-foreground">local edge engine</strong> built to index portfolios directly in sandboxed database environments, matching engineering gaps with immediate precision.
                </p>

                <h2 id="why-edge" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    Why Edge Intelligence?
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    By porting complex machine learning models directly into standardized client environments, we eliminate cloud subscription overhead and guarantee privacy:
                </p>
                <ul className="space-y-2 pl-5 list-disc text-sm text-muted-foreground leading-relaxed mb-6">
                    <li><strong className="text-foreground">Zero Server Latency:</strong> Inference pipelines run natively inside your hardware threads.</li>
                    <li><strong className="text-foreground">Zero Cloud Retention:</strong> Resumes and voice inputs are parsed inside the local sandbox — never uploaded.</li>
                    <li><strong className="text-foreground">Offline Availability:</strong> Track and evaluate placement skills even without an active internet connection.</li>
                </ul>

                <h2 id="loop" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    The Growth Loop Metaphor
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Instead of treating preparation as isolated assignments, Jobyn orchestrates an elegant, closed-loop growth pathway:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { num: '01', color: 'text-cyan', title: 'Ingestion', desc: 'Parse and structure technical portfolios locally.' },
                        { num: '02', color: 'text-violet', title: 'Assessment', desc: 'Map experience delta against industry frameworks.' },
                        { num: '03', color: 'text-mint', title: 'Simulations', desc: 'Simulate live SDE technical rounds offline.' },
                    ].map(step => (
                        <Card key={step.num} className="bg-white/[0.02] border-border/50">
                            <CardContent className="p-4">
                                <div className={cn('text-lg font-bold mb-1', step.color)}>{step.num}</div>
                                <h4 className="text-sm font-bold mb-1">{step.title}</h4>
                                <p className="text-xs text-muted-foreground">{step.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 'quickstart',
        title: 'Quickstart Guide',
        category: 'Getting Started',
        icon: Terminal,
        toc: [
            { id: 'installation', text: 'Installation' },
            { id: 'spinnup', text: 'Spinning Up Dev Server' },
            { id: 'first-inbound', text: 'Your First Resume Scan' }
        ],
        content: (
            <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-[family-name:var(--font-heading)]">
                    Quickstart Guide
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Deploy and run Jobyn on your local development machine in under two minutes.
                </p>

                <h2 id="installation" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    Installation
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Clone the repository and install core dependencies. Make sure you have Node.js 18+ loaded on your host machine.
                </p>
                <CodeBlock title="Terminal">
{`$ git clone https://github.com/Ganesh-0509/Jobyn.git
$ cd Jobyn/frontend
$ npm install`}
                </CodeBlock>

                <h2 id="spinnup" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    Spinning Up Dev Server
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Launch the local development environment. By default, the application runs on port <code className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-border/50 font-mono text-xs">5173</code>.
                </p>
                <CodeBlock title="Terminal">
{`$ npm run dev
  ➜  Local:   http://localhost:5173/`}
                </CodeBlock>

                <h2 id="first-inbound" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    Your First Resume Scan
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Open <code className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-border/50 font-mono text-xs">http://localhost:5173/</code> in your browser. Drag and drop any standardized technical resume (PDF format) directly into the Hero dropzone. The client-side scanner will extract structure in under 3 seconds and redirect you to the skill analysis dashboard.
                </p>
            </div>
        )
    },
    {
        id: 'onnx-engine',
        title: 'ONNX WebAssembly AI',
        category: 'Core System',
        icon: Cpu,
        toc: [
            { id: 'how-onnx-works', text: 'How ONNX Runtime Web Works' },
            { id: 'model-spec', text: 'Local Model Specifications' },
            { id: 'code-example', text: 'WASM Inference Integration' }
        ],
        content: (
            <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-[family-name:var(--font-heading)]">
                    ONNX WebAssembly AI Engine
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Learn how Jobyn loads and runs machine learning models offline inside the client sandbox using WASM execution pipelines.
                </p>

                <h2 id="how-onnx-works" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    How ONNX Runtime Web Works
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    To keep data secure and ensure instant calculations, we compile lightweight <strong className="text-foreground">RandomForest</strong> classifiers and NLP embedding encoders into <code className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-border/50 font-mono text-xs">.onnx</code> formats. When a user lands on the dashboard, the page initializes an asynchronous WebAssembly worker thread, loads the model file from public assets, and runs all inference metrics strictly on the client.
                </p>

                <Card className="bg-crimson/5 border-crimson/15 mb-6">
                    <CardContent className="p-4 flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-crimson shrink-0 mt-0.5" />
                        <div>
                            <strong className="block text-sm text-foreground mb-1">Hardware Acceleration Warning</strong>
                            <span className="text-xs text-muted-foreground leading-relaxed">
                                Make sure hardware acceleration is enabled inside your browser settings to allow multi-threaded WebAssembly to access web hardware threads, decreasing inference loops from 800ms down to 40ms.
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <h2 id="model-spec" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    Local Model Specifications
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Jobyn ships with three client-side model files:
                </p>
                <div className="rounded-lg border border-border/50 overflow-hidden mb-6">
                    <table className="w-full text-xs text-left">
                        <thead>
                            <tr className="border-b-2 border-border/50 bg-white/[0.02]">
                                <th className="p-3 text-foreground font-semibold">Model</th>
                                <th className="p-3 text-foreground font-semibold">Size</th>
                                <th className="p-3 text-foreground font-semibold">Output</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ['resume_parser.onnx', '1.2 MB', 'NLP Entity extraction for technical skills'],
                                ['role_classifier.onnx', '450 KB', 'RandomForest portfolio readiness scoring'],
                                ['skill_alignment.onnx', '850 KB', 'SDE track delta scoring indexes'],
                            ].map(([m, s, o], i) => (
                                <tr key={i} className="border-b border-border/30 last:border-0">
                                    <td className="p-3 font-mono text-cyan/80">{m}</td>
                                    <td className="p-3 text-muted-foreground">{s}</td>
                                    <td className="p-3 text-muted-foreground">{o}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <h2 id="code-example" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    WASM Inference Integration
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Reference snippet demonstrating how the client loads and runs the role classifier:
                </p>
                <CodeTabs
                    js={`// Load ONNX Runtime Web assembly
import * as ort from 'onnxruntime-web';

async function runRoleInference(inputFeatures) {
    const session = await ort.InferenceSession.create('/models/role_classifier.onnx');
    const inputTensor = new ort.Tensor('float32', Float32Array.from(inputFeatures), [1, 14]);

    const outputs = await session.run({ 'input': inputTensor });
    return outputs.output.data; // Array of role readiness scores
}`}
                    py={`# Load ONNX runtime inside local testing scripts
import onnxruntime as ort
import numpy as np

def run_role_inference(input_features):
    session = ort.InferenceSession("role_classifier.onnx")
    input_data = np.array([input_features], dtype=np.float32)

    outputs = session.run(None, {"input": input_data})
    return outputs[0] # Role readiness scores`}
                />
            </div>
        )
    },
    {
        id: 'privacy-shield',
        title: 'Privacy Shield Framework',
        category: 'Security',
        icon: Shield,
        toc: [
            { id: 'compliance', text: 'Legal Compliance GDPR / CCPA' },
            { id: 'local-only', text: 'Local Sandbox Storage' }
        ],
        content: (
            <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-[family-name:var(--font-heading)]">
                    Privacy Shield Framework
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Jobyn is engineered with rigorous structural guarantees to ensure student credentials never face exposure.
                </p>

                <h2 id="compliance" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    Legal Compliance GDPR / CCPA
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    By allowing all critical profile parsing and simulation scripts to run locally, the platform aligns naturally with strict legal criteria:
                </p>
                <ul className="space-y-2 pl-5 list-disc text-sm text-muted-foreground leading-relaxed mb-6">
                    <li><strong className="text-foreground">GDPR Right to Erasure:</strong> Wiping your data is instant. Head to settings to fully clear your IndexedDB state; zero backup lags remain.</li>
                    <li><strong className="text-foreground">CCPA Data Control:</strong> Your professional records are strictly yours. Since data never logs in central cloud storage, selling or sharing credentials is physically impossible.</li>
                </ul>

                <h2 id="local-only" className="text-xl font-bold tracking-tight mt-8 mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                    Local Sandbox Storage
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    All generated improvement tracks, interview transcripts, and performance profiles are cached natively using securely sandboxed browser APIs. Your data stays in the boundaries of your local user profile.
                </p>
            </div>
        )
    }
]

export default function Docs() {
    const [searchQuery, setSearchQuery] = useState('')
    const [activePage, setActivePage] = useState('intro')

    const filteredPages = docPages.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const activeDoc = docPages.find(p => p.id === activePage) || docPages[0]

    return (
        <div className="min-h-screen bg-background">
            <SEO
                title="Documentation — Jobyn"
                description="Learn how Jobyn works. ONNX-powered AI, privacy-first resume analysis, skill gap detection, and career readiness scoring."
            />
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link to="/" className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.03] border border-border/50 text-foreground hover:bg-white/[0.06] transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <span className="text-sm font-bold tracking-tight">Jobyn Docs</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">v1.2.0 · Local AI Mode</span>
            </header>

            {/* Three-column shell */}
            <div className="flex max-w-[1440px] mx-auto">
                {/* Left sidebar */}
                <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-border/50 bg-white/[0.01] p-5 h-[calc(100vh-49px)] sticky top-[49px] overflow-y-auto gap-5">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search docs..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-xs bg-white/[0.02] border-border/50"
                        />
                    </div>

                    {/* Nav */}
                    <nav className="flex flex-col gap-5">
                        {['Getting Started', 'Core System', 'Security'].map(category => {
                            const pages = filteredPages.filter(p => p.category === category)
                            if (pages.length === 0) return null
                            return (
                                <div key={category}>
                                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                                        {category}
                                    </h4>
                                    <ul className="flex flex-col gap-0.5">
                                        {pages.map(page => {
                                            const PageIcon = page.icon
                                            const isActive = activePage === page.id
                                            return (
                                                <li key={page.id}>
                                                    <button
                                                        onClick={() => setActivePage(page.id)}
                                                        className={cn(
                                                            'w-full flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium text-left transition-all',
                                                            isActive
                                                                ? 'bg-cyan/10 text-cyan'
                                                                : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                                                        )}
                                                    >
                                                        <PageIcon className="h-3.5 w-3.5 shrink-0" />
                                                        {page.title}
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )
                        })}
                    </nav>
                </aside>

                {/* Main content */}
                <main className="flex-1 px-6 md:px-10 py-8 md:py-12 max-w-[820px]">
                    <motion.div
                        key={activePage}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <article>{activeDoc.content}</article>
                    </motion.div>

                    {/* Feedback footer */}
                    <div className="mt-12 pt-6 border-t border-border/50 flex items-center justify-between flex-wrap gap-4">
                        <span className="text-xs text-muted-foreground">Was this page helpful?</span>
                        <div className="flex gap-2">
                            {['Yes', 'No'].map(v => (
                                <button key={v} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/[0.02] border border-border/50 text-foreground hover:bg-white/[0.06] transition-colors">
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Right sidebar (TOC) */}
                <aside className="hidden lg:block w-[220px] shrink-0 py-12 px-5 h-[calc(100vh-49px)] sticky top-[49px] overflow-y-auto">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                        On This Page
                    </h4>
                    <ul className="flex flex-col gap-2.5">
                        {activeDoc.toc.map(item => (
                            <li key={item.id}>
                                <a
                                    href={`#${item.id}`}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                                >
                                    {item.text}
                                </a>
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
        </div>
    )
}
