import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Search, Database, EyeOff, Lock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface PolicySection {
    id: string
    title: string
    content: React.ReactNode
}

function AccordionItem({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="rounded-lg border border-border/50 overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-white/[0.02] transition-colors"
            >
                {title}
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {open && (
                <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/50">
                    <div className="pt-3">{children}</div>
                </div>
            )}
        </div>
    )
}

const policySections: PolicySection[] = [
    {
        id: 'intro',
        title: '1. Executive Summary & Core Pillars',
        content: (
            <div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Jobyn operates on a <strong className="text-foreground">Zero-Cloud-Retention Architecture</strong>. Unlike traditional platforms that harvest technical portfolios and resumes onto centralized databases, our system relies on client-side sandboxed environments. Your data belongs exclusively to you and remains hosted on your physical machine.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <Card className="bg-mint/5 border-mint/15">
                        <CardContent className="p-4">
                            <h4 className="text-xs font-bold text-mint mb-1.5 flex items-center gap-1.5">
                                <EyeOff className="h-3.5 w-3.5" /> Zero Tracking
                            </h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Resumes and portfolio transcripts are parsed entirely within client sandboxes. We never view or log raw documents.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-cyan/5 border-cyan/15">
                        <CardContent className="p-4">
                            <h4 className="text-xs font-bold text-cyan mb-1.5 flex items-center gap-1.5">
                                <Database className="h-3.5 w-3.5" /> Sandbox Encryption
                            </h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Calculated SDE track alignment states are stored locally on encrypted browser IndexedDB databases.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    },
    {
        id: 'data-matrix',
        title: '2. Unified Data Telemetry Matrix',
        content: (
            <div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    To guarantee complete transparency, the following technical matrix details exactly how each data point is generated, cached, and destroyed:
                </p>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                    <table className="w-full text-xs text-left">
                        <thead>
                            <tr className="border-b-2 border-border/50 bg-white/[0.02]">
                                <th className="p-3 text-foreground font-semibold">Data Point</th>
                                <th className="p-3 text-foreground font-semibold">Extraction</th>
                                <th className="p-3 text-foreground font-semibold">Storage</th>
                                <th className="p-3 text-foreground font-semibold">Cloud Upload</th>
                                <th className="p-3 text-foreground font-semibold">Wipe Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ['PDF Resumes', 'Local WASM Parser', 'RAM (Ephemeral)', 'NEVER', 'Wiped on reload'],
                                ['Skill Indexes', 'ONNX classifiers', 'IndexedDB', 'NEVER', 'Settings → Clear'],
                                ['Voice Recordings', 'Speech API', 'RAM (Ephemeral)', 'NEVER', 'Wiped on exit'],
                                ['Auth Credentials', 'User Registration', 'Secure Cloud', 'Yes (Auth Only)', 'Settings → Delete'],
                            ].map(([dp, ex, st, cl, wi], i) => (
                                <tr key={i} className="border-b border-border/30 last:border-0">
                                    <td className="p-3 font-medium text-foreground">{dp}</td>
                                    <td className="p-3 text-muted-foreground">{ex}</td>
                                    <td className="p-3 font-mono text-muted-foreground">{st}</td>
                                    <td className={`p-3 font-semibold ${cl === 'NEVER' ? 'text-crimson' : 'text-mint'}`}>{cl}</td>
                                    <td className="p-3 text-muted-foreground">{wi}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    },
    {
        id: 'gdpr-ccpa',
        title: '3. Legal Standards (GDPR, CCPA & FERPA)',
        content: (
            <div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Jobyn explicitly aligns its internal structures with standard global compliance frameworks:
                </p>
                <div className="flex flex-col gap-2">
                    <AccordionItem title="GDPR Alignment (Articles 15 & 17)">
                        Under GDPR Article 17 (Right to Erasure), any user can wipe their technical indicators, parsed resumes, and performance logs instantly. Because all calculations run within browser IndexedDB sandboxes, erasing the state is fully local and does not leave residual backups on remote servers.
                    </AccordionItem>
                    <AccordionItem title="CCPA Alignment (Data Sharing & Transparency)">
                        Jobyn does not sell, barter, or distribute your technical assessments or speech telemetry. All models running on ONNX Runtime Web execute offline in sandboxed client scripts. We have zero central access to your portfolios.
                    </AccordionItem>
                    <AccordionItem title="FERPA Alignment (Student Telemetry Protection)">
                        Our platform strictly aligns with the Family Educational Rights and Privacy Act (FERPA) by ensuring that academic scores, portfolio benchmarks, and technical training profiles are not public or exposed without user-authorized cloud synchronization.
                    </AccordionItem>
                </div>
            </div>
        )
    }
]

export default function Privacy() {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredSections = policySections.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link to="/" className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.03] border border-border/50 text-foreground hover:bg-white/[0.06] transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <span className="text-sm font-bold tracking-tight">Jobyn Privacy Center</span>
                </div>
                <Badge variant="outline" className="text-xs border-mint/30 text-mint">
                    <CheckCircle className="h-3 w-3 mr-1" /> Compliance Audited
                </Badge>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Title */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[11px] font-mono text-cyan font-semibold">VERSION 1.1</span>
                            <span className="text-border">·</span>
                            <span className="text-xs text-muted-foreground">Last Updated: May 24, 2026</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-heading)]">
                            Privacy Shield Policy
                        </h1>
                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                            Learn how we protect student datasets using end-to-end sandboxed intelligence, absolute data ownership, and strict zero cloud retention logs.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative mb-8">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter policy sections..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white/[0.02] border-border/50"
                        />
                    </div>

                    {/* Sections */}
                    <div className="flex flex-col gap-8">
                        {filteredSections.map((section, i) => (
                            <motion.section
                                key={section.id}
                                id={section.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                            >
                                <h2 className="text-lg font-bold tracking-tight mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                                    {section.title}
                                </h2>
                                {section.content}
                            </motion.section>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
