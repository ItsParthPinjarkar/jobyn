import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FileUp, Target, Search, Mic, FolderGit2, CheckCircle, Trophy, ChevronDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'
import type { UploadResult } from '../api/client'

interface MilestoneDef {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    achieved: boolean
    sub: string
}

interface MilestoneCardProps {
    analysis: UploadResult | null
    completedTasks: string[]
    score: number
}

export default function MilestoneCard({ analysis, completedTasks, score }: MilestoneCardProps) {
    const [open, setOpen] = useState(false)

    const milestones: MilestoneDef[] = useMemo(() => [
        { id: 'first_upload', label: 'First Resume Upload', icon: FileUp, achieved: !!analysis, sub: 'Upload your resume' },
        { id: 'first_score', label: 'Got Your Readiness Score', icon: Target, achieved: !!analysis?.final_score, sub: 'Get scored' },
        { id: 'skill_gap_identified', label: 'Identified Skill Gaps', icon: Search, achieved: !!(analysis?.missing_core_skills?.length || analysis?.missing_optional_skills?.length), sub: 'Find what to improve' },
        { id: 'first_interview', label: 'Practiced First Interview', icon: Mic, achieved: !!localStorage.getItem('interview_session_count'), sub: 'Try interview practice' },
        { id: 'first_project', label: 'Generated First Project', icon: FolderGit2, achieved: (completedTasks?.length ?? 0) > 0, sub: 'Build a project' },
        { id: 'ready_to_apply', label: 'Ready to Apply (80%+)', icon: CheckCircle, achieved: score >= 80, sub: 'Reach 80% readiness' },
    ], [analysis, completedTasks, score])

    const achievedCount = milestones.filter(m => m.achieved).length
    const pct = Math.round((achievedCount / milestones.length) * 100)

    if (!analysis) return null

    return (
        <Card className="premium-hover-card">
            <CardContent className="p-4">
                <Collapsible open={open} onOpenChange={setOpen}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-primary/10 p-1.5">
                                <Trophy className="size-4 text-primary" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-foreground">Career Milestones</div>
                                <div className="text-xs text-muted-foreground">{achievedCount} of {milestones.length} completed</div>
                            </div>
                        </div>
                        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Badge variant="outline" className="text-[10px]">{pct}%</Badge>
                            <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                    </div>

                    <Progress value={pct} className="h-1.5 mb-1" />

                    <CollapsibleContent>
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 space-y-2"
                        >
                            {milestones.map((m) => {
                                const Icon = m.icon
                                return (
                                    <div
                                        key={m.id}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                                            m.achieved ? 'bg-accent/5' : 'bg-muted/30'
                                        }`}
                                    >
                                        <div className={`shrink-0 ${m.achieved ? 'text-accent' : 'text-muted-foreground/50'}`}>
                                            {m.achieved ? <CheckCircle className="size-4" /> : <Icon className="size-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-medium ${m.achieved ? 'text-accent line-through' : 'text-foreground'}`}>
                                                {m.label}
                                            </div>
                                        </div>
                                        {m.achieved && (
                                            <Badge variant="outline" className="text-[9px] border-accent/30 text-accent">Done</Badge>
                                        )}
                                    </div>
                                )
                            })}
                        </motion.div>
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    )
}
