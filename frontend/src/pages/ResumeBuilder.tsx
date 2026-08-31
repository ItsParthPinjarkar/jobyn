import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useResume } from '../context/ResumeContext'
import { buildResume, type ResumeBuilderResult } from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FileText, Sparkles, Download, Copy, CheckCircle2,
  Building2, Briefcase, ArrowLeft, Zap, ExternalLink,
} from 'lucide-react'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }

export default function ResumeBuilder() {
    const { analysis } = useResume()

    const [jdText, setJdText] = useState('')
    const [jdTitle, setJdTitle] = useState('')
    const [jdCompany, setJdCompany] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<ResumeBuilderResult | null>(null)
    const [copied, setCopied] = useState(false)

    // Pre-fill from user's analysis data
    const userSkills = analysis?.detected_skills ?? []
    const userLinks = analysis?.links ?? []

    const handleBuild = async () => {
        if (!jdText.trim() || jdText.trim().length < 20) {
            setError('Please paste a job description (at least 20 characters).')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await buildResume({
                jd_text: jdText,
                jd_title: jdTitle || undefined,
                jd_company: jdCompany || undefined,
                skills: userSkills,
                education: '',  // User can edit this in the form if needed
                projects: '',
                links: userLinks,
            })
            setResult(res)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to generate resume. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = () => {
        if (result?.resume) {
            navigator.clipboard.writeText(result.resume)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleDownload = () => {
        if (!result?.resume) return
        const blob = new Blob([result.resume], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `resume-${jdCompany || 'tailored'}-${jdTitle || 'position'}.md`.replace(/\s+/g, '-').toLowerCase()
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <motion.div {...fadeUp}>
                <h1 className="font-heading text-2xl font-bold tracking-tight">Resume Builder</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Paste a job description and get a tailored resume optimized for that role.
                </p>
            </motion.div>

            {/* No skills warning */}
            {userSkills.length === 0 && (
                <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
                    <Card className="border-warning/30">
                        <CardContent className="flex items-center gap-3 pt-6">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                                <FileText className="size-5 text-warning" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">No profile data found</p>
                                <p className="text-xs text-muted-foreground">
                                    Upload a resume or enter your profile manually first, then come back to build a tailored resume.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Input Panel */}
                <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Building2 className="size-4 text-primary" />
                                Job Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Job Title (optional)</Label>
                                    <Input
                                        placeholder="e.g. Full Stack Developer"
                                        value={jdTitle}
                                        onChange={e => setJdTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Company (optional)</Label>
                                    <Input
                                        placeholder="e.g. Google"
                                        value={jdCompany}
                                        onChange={e => setJdCompany(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Paste Job Description *</Label>
                                <Textarea
                                    placeholder="Paste the full job description here..."
                                    value={jdText}
                                    onChange={e => setJdText(e.target.value)}
                                    rows={12}
                                    className="resize-none"
                                />
                                <p className="text-[10px] text-muted-foreground text-right">
                                    {jdText.length} characters
                                </p>
                            </div>

                            {/* User's detected skills preview */}
                            {userSkills.length > 0 && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Your Skills (from profile)</Label>
                                    <div className="flex flex-wrap gap-1">
                                        {userSkills.slice(0, 15).map(s => (
                                            <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                        ))}
                                        {userSkills.length > 15 && (
                                            <Badge variant="outline" className="text-[10px]">+{userSkills.length - 15} more</Badge>
                                        )}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={handleBuild}
                                disabled={jdText.trim().length < 20 || loading || userSkills.length === 0}
                                className="w-full gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                        Generating Resume...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="size-4" />
                                        Build Tailored Resume
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Output Panel */}
                <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
                    <Card className="h-full">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FileText className="size-4 text-primary" />
                                    Generated Resume
                                </CardTitle>
                                {result && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                                            {copied ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                                            <Download className="size-3.5" />
                                            .md
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {result ? (
                                <div className="space-y-4">
                                    {/* Match info */}
                                    {result.matched_skills.length > 0 && (
                                        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Zap className="size-3.5 text-accent" />
                                                <span className="text-xs font-semibold text-accent">
                                                    {result.matched_skills.length} skills matched to JD
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {result.matched_skills.map(s => (
                                                    <Badge key={s} variant="secondary" className="text-[10px] bg-accent/10 text-accent">
                                                        {s}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Method badge */}
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px]">
                                            {result.method === 'ai' ? 'AI-Generated' : 'Template-Based'}
                                        </Badge>
                                        {result.jd_skills.length > 0 && (
                                            <Badge variant="outline" className="text-[10px]">
                                                {result.jd_skills.length} JD skills detected
                                            </Badge>
                                        )}
                                    </div>

                                    <Separator />

                                    {/* Resume content */}
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                                            {result.resume}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
                                        <FileText className="size-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">No resume generated yet</p>
                                    <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                                        Paste a job description and click "Build Tailored Resume" to generate a resume optimized for that role.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    )
}
