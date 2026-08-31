import { useNavigate } from 'react-router-dom'
import { useResume } from '../context/ResumeContext'
import { TrendingUp, ArrowUpRight, ArrowDownRight, Plus, Minus, Equal, GitCompareArrows, Upload, PenLine } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }

export default function ResumeComparison() {
    const navigate = useNavigate()
    const { analysis, previousAnalysis } = useResume()

    const curr = analysis
    const prev = previousAnalysis

    const currScore = curr?.final_score ?? 0
    const prevScore = prev?.final_score ?? 0
    const currSkills = curr?.detected_skills ?? []
    const prevSkills = prev?.detected_skills ?? []

    const prevSet = new Set(prevSkills.map(s => s.toLowerCase()))
    const currSet = new Set(currSkills.map(s => s.toLowerCase()))

    const shared = currSkills.filter(s => prevSet.has(s.toLowerCase()))
    const added = currSkills.filter(s => !prevSet.has(s.toLowerCase()))
    const removed = prevSkills.filter(s => !currSet.has(s.toLowerCase()))

    const diff = currScore - prevScore

    if (!curr || !prev) {
        return (
            <div className="mx-auto max-w-xl py-20 text-center">
                <motion.div {...fadeUp}>
                    <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-muted">
                        <GitCompareArrows className="size-10 text-muted-foreground" />
                    </div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight">Version Comparison Locked</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Upload at least two versions of your resume to see side-by-side improvements.
                    </p>
                    <Button className="mt-6 gap-2" onClick={() => navigate('/resume-analyzer')}>
                        <Upload className="size-4" /> Upload Second Version
                    </Button>
                    <Card className="mt-10 text-left">
                        <CardContent className="grid gap-6 pt-6 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Score Delta</p>
                                <p className="mt-1 text-sm text-muted-foreground">Directly see how much your latest changes improved your readiness.</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Skill Evolution</p>
                                <p className="mt-1 text-sm text-muted-foreground">Track which skills the AI detected in your new version vs the old one.</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <motion.div {...fadeUp} className="flex items-start justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight">Resume Comparison</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Compare your resume versions side by side</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/resume-builder')} className="gap-2 shrink-0">
                    <PenLine className="size-3.5" />
                    Resume Builder
                </Button>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
                {/* Previous Version */}
                <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
                    <Card>
                        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-sm font-medium">First Upload</CardTitle>
                            <span className="font-mono text-2xl font-bold text-muted-foreground">{prevScore}%</span>
                        </CardHeader>
                        <CardContent className="space-y-1.5">
                            {[...shared, ...removed].slice(0, 8).map(s => (
                                <div
                                    key={s}
                                    className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium ${
                                        removed.includes(s)
                                            ? 'bg-destructive/10 text-destructive'
                                            : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {removed.includes(s) ? <Minus className="size-3 shrink-0" /> : <Equal className="size-3 shrink-0 text-border" />}
                                    {s}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Current Version */}
                <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                    <Card className="border-primary/20">
                        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-sm font-medium">Latest Upload</CardTitle>
                            <span className="font-mono text-2xl font-bold text-primary">{currScore}%</span>
                        </CardHeader>
                        <CardContent className="space-y-1.5">
                            {shared.slice(0, 5).map(s => (
                                <div key={s} className="flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                                    <Equal className="size-3 shrink-0 text-border" /> {s}
                                </div>
                            ))}
                            {added.slice(0, 4).map(s => (
                                <div key={s} className="flex items-center gap-2 rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                                    <Plus className="size-3 shrink-0" /> {s}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Score Difference */}
            <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${diff >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                            {diff >= 0
                                ? <ArrowUpRight className="size-5 text-success" />
                                : <ArrowDownRight className="size-5 text-destructive" />
                            }
                        </div>
                        <div>
                            <p className={`text-lg font-bold ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {diff >= 0 ? `+${diff}%` : `${diff}%`} change
                            </p>
                            <p className="text-xs text-muted-foreground">
                                + {added.length} skills added &middot; &minus; {removed.length} skills removed
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
