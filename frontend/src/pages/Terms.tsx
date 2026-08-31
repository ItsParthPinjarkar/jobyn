import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Scale, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface TermChapter {
    id: string
    title: string
    content: React.ReactNode
}

const termChapters: TermChapter[] = [
    {
        id: 'agreement',
        title: '1. Agreement to Terms',
        content: (
            <p className="text-sm text-muted-foreground leading-relaxed">
                By accessing or utilizing the Jobyn platform, you agree to be bound by these Terms and Conditions in their entirety. If you do not agree with any clause of these terms, you are prohibited from using the platform and must immediately cease all sandbox execution and clear your browser storage data.
            </p>
        )
    },
    {
        id: 'telemetry',
        title: '2. On-Device Telemetry & WebAssembly Execution',
        content: (
            <div className="text-sm text-muted-foreground leading-relaxed">
                <p className="mb-3">
                    Jobyn is a decentralized, browser-level analytical interface. You acknowledge and agree to the following technical operational parameters:
                </p>
                <ul className="space-y-3 pl-5 list-disc">
                    <li>
                        <strong className="text-foreground">Hardware Overhead:</strong> Machine learning inference pipelines (including ONNX Runtime Web and WASM models) are executed directly on your hardware processor. Jobyn is not responsible for local device performance fluctuations, thermal limits, or browser crashes during runtime execution.
                    </li>
                    <li>
                        <strong className="text-foreground">Local Storage Telemetry:</strong> Calculated readiness indexes, assessment scores, and training progress markers are cached strictly inside your local sandbox (IndexedDB). Wiping your browser history or resetting the local sandbox will permanently delete this telemetry.
                    </li>
                </ul>
            </div>
        )
    },
    {
        id: 'intellectual-property',
        title: '3. Resume Ownership & Intellectual Property',
        content: (
            <div className="text-sm text-muted-foreground leading-relaxed">
                <p className="mb-3">
                    Your intellectual property rights are sacred. Jobyn does not acquire ownership over any technical portfolios, documents, resumes, or voice recordings processed through our interface:
                </p>
                <ul className="space-y-3 pl-5 list-disc">
                    <li>
                        <strong className="text-foreground">Absolute Retention:</strong> Uploaded technical credentials, CVs, and portfolios remain 100% your property. Since all parsing is sandboxed inside ephemeral browser memory, we do not store, copy, or distribute your intellectual property.
                    </li>
                    <li>
                        <strong className="text-foreground">Platform Materials:</strong> All proprietary source code, vector graphics, interface timelines, and ONNX compiled model binaries represent the exclusive intellectual property of Jobyn, protected under international copyright treaties.
                    </li>
                </ul>
            </div>
        )
    },
    {
        id: 'limitation',
        title: '4. Limitation of Liability',
        content: (
            <p className="text-sm text-muted-foreground leading-relaxed">
                In no event shall Jobyn, its creators, or partners be liable for any indirect, punitive, incidental, or consequential damages (including, without limitation, missed recruitment opportunities, incorrect skill assessment scoring, or rejection from placement campaigns) arising out of or in connection with the use or performance of our local AI advisor.
            </p>
        )
    }
]

export default function Terms() {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredChapters = termChapters.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link to="/" className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.03] border border-border/50 text-foreground hover:bg-white/[0.06] transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <span className="text-sm font-bold tracking-tight">Jobyn Terms of Service</span>
                </div>
                <Badge variant="outline" className="text-xs border-cyan/30 text-cyan">
                    <Scale className="h-3 w-3 mr-1" /> Legal Framework
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
                            <span className="text-[11px] font-mono text-cyan font-semibold">TOS VERSION 1.0</span>
                            <span className="text-border">·</span>
                            <span className="text-xs text-muted-foreground">Effective Date: May 24, 2026</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-heading)]">
                            Terms of Service
                        </h1>
                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                            Please review our standard operational agreement governing on-device browser metrics and student assessment limits.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative mb-8">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter terms..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white/[0.02] border-border/50"
                        />
                    </div>

                    {/* Chapters */}
                    <div className="flex flex-col gap-8">
                        {filteredChapters.map((chapter, i) => (
                            <motion.section
                                key={chapter.id}
                                id={chapter.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                            >
                                <h2 className="text-lg font-bold tracking-tight mb-4 pb-2 border-b border-border/50 font-[family-name:var(--font-heading)]">
                                    {chapter.title}
                                </h2>
                                {chapter.content}
                            </motion.section>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
