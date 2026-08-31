import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useResume } from '../context/ResumeContext'
import { X, Upload, Target, Mic, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NudgeState {
    id: string
    icon: React.ComponentType<{ className?: string }>
    message: string
    cta: string
    path: string
    color: string
}

export default function OnboardingNudge() {
    const { user } = useAuth()
    const { analysis, masteredSkills } = useResume()
    const navigate = useNavigate()
    const [dismissed, setDismissed] = useState<Set<string>>(new Set())

    // Load dismissed nudges from localStorage
    useEffect(() => {
        if (!user?.email) return
        const prefix = `${user.email}_cse_nudge_`
        const dismissedIds = new Set<string>()
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith(prefix) && key.endsWith('_dismissed')) {
                const nudgeId = key.slice(prefix.length, -'_dismissed'.length)
                dismissedIds.add(nudgeId)
            }
        }
        setDismissed(dismissedIds)
    }, [user?.email])

    // Calculate account age in days
    const accountAgeDays = useMemo(() => {
        if (!user?.email) return 0
        const created = localStorage.getItem(`${user.email}_cse_account_created`)
        if (!created) return 1 // assume at least 1 day if no timestamp
        return Math.floor((Date.now() - new Date(created).getTime()) / 86400000)
    }, [user?.email])

    const activeNudge = useMemo<NudgeState | null>(() => {
        if (!user?.email) return null

        // Nudge 1: No analysis + account > 1 day
        if (!analysis && accountAgeDays >= 1 && !dismissed.has('no_resume')) {
            return {
                id: 'no_resume',
                icon: Upload,
                message: 'Your resume is waiting — see your score in 60 seconds',
                cta: 'Upload Now',
                path: '/resume-analyzer',
                color: 'border-primary/30 bg-primary/5 text-primary',
            }
        }

        // Nudge 2: Analysis done but no skill exploration
        if (analysis && masteredSkills.length === 0 && !dismissed.has('no_skills')) {
            return {
                id: 'no_skills',
                icon: Target,
                message: 'Your top skill gaps are ready — start closing them',
                cta: 'View Gaps',
                path: '/skill-gap',
                color: 'border-accent/30 bg-accent/5 text-accent',
            }
        }

        // Nudge 3: No interview practice after analysis
        if (analysis && !localStorage.getItem('interview_session_count') && !dismissed.has('no_interview')) {
            return {
                id: 'no_interview',
                icon: Mic,
                message: 'Ready for a mock interview? Practice makes placement-ready',
                cta: 'Start Interview',
                path: '/interview-readiness',
                color: 'border-violet/30 bg-violet/5 text-violet',
            }
        }

        // Nudge 4: Score < 80 + 3 days inactive
        if (analysis && (analysis.final_score ?? 0) < 80 && accountAgeDays >= 3 && !dismissed.has('inactive')) {
            return {
                id: 'inactive',
                icon: AlertTriangle,
                message: 'Your skills are getting rusty — come back and practice',
                cta: 'Resume Practice',
                path: '/improvement-plan',
                color: 'border-warning/30 bg-warning/5 text-warning',
            }
        }

        return null
    }, [user?.email, analysis, masteredSkills, accountAgeDays, dismissed])

    if (!activeNudge) return null

    const Icon = activeNudge.icon

    const dismiss = () => {
        if (!user?.email) return
        const key = `${user.email}_cse_nudge_${activeNudge.id}_dismissed`
        localStorage.setItem(key, 'true')
        setDismissed(prev => new Set([...prev, activeNudge.id]))
    }

    return (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${activeNudge.color}`}>
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 font-medium">{activeNudge.message}</span>
            <Button
                size="sm"
                variant="ghost"
                className="shrink-0 gap-1.5 text-xs font-semibold"
                onClick={() => navigate(activeNudge.path)}
            >
                {activeNudge.cta}
            </Button>
            <button
                onClick={dismiss}
                className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
            >
                <X className="size-3.5" />
            </button>
        </div>
    )
}
