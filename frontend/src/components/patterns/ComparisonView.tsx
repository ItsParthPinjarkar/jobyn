import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface ComparisonViewProps {
  left: ReactNode
  right: ReactNode
  leftLabel?: string
  rightLabel?: string
  className?: string
}

export default function ComparisonView({ left, right, leftLabel, rightLabel, className }: ComparisonViewProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      <div className="space-y-2">
        {leftLabel && <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{leftLabel}</h4>}
        <div className="rounded-lg border border-border bg-surface overflow-hidden">{left}</div>
      </div>
      <div className="space-y-2">
        {rightLabel && <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rightLabel}</h4>}
        <div className="rounded-lg border border-border bg-surface overflow-hidden">{right}</div>
      </div>
    </div>
  )
}
