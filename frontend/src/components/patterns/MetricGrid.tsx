import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface MetricGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4
  className?: string
}

export default function MetricGrid({ children, columns = 4, className }: MetricGridProps) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <div className={cn('grid gap-4', colClass, className)}>
      {children}
    </div>
  )
}

interface MetricCardProps {
  icon?: ReactNode
  label: string
  value: string | number
  delta?: string
  deltaTrend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function MetricCard({ icon, label, value, delta, deltaTrend = 'neutral', className }: MetricCardProps) {
  const deltaColor = deltaTrend === 'up' ? 'text-mint' : deltaTrend === 'down' ? 'text-crimson' : 'text-muted-foreground'

  return (
    <div className={cn('rounded-lg border border-border bg-surface p-5 space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-heading text-2xl font-bold tabular-nums text-foreground">{value}</span>
        {delta && (
          <span className={cn('text-xs font-medium', deltaColor)}>{delta}</span>
        )}
      </div>
    </div>
  )
}
