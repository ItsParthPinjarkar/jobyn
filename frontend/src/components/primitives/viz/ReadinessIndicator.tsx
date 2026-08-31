import { Check, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReadinessIndicatorProps {
  level: 'ready' | 'almost' | 'needs-work' | 'not-started'
  className?: string
}

const CONFIG = {
  ready: { icon: Check, label: 'Ready', bg: 'bg-mint/10', text: 'text-mint', border: 'border-mint/20' },
  almost: { icon: TrendingUp, label: 'Almost', bg: 'bg-amber/10', text: 'text-amber', border: 'border-amber/20' },
  'needs-work': { icon: AlertCircle, label: 'Needs Work', bg: 'bg-crimson/10', text: 'text-crimson', border: 'border-crimson/20' },
  'not-started': { icon: Clock, label: 'Not Started', bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border' },
} as const

export default function ReadinessIndicator({ level, className }: ReadinessIndicatorProps) {
  const { icon: Icon, label, bg, text, border } = CONFIG[level]

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', bg, text, border, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
