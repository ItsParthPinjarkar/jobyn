import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { GlassCard } from './GlassCard'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  delta?: string
  deltaType?: 'positive' | 'negative' | 'neutral'
  icon?: LucideIcon
  className?: string
}

const deltaColorMap = {
  positive: 'text-mint',
  negative: 'text-crimson',
  neutral: 'text-muted-foreground',
}

const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ label, value, delta, deltaType = 'neutral', icon: Icon, className, ...props }, ref) => (
    <GlassCard ref={ref} hover className={cn('flex flex-col gap-3', className)} {...props}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex items-end gap-2">
        <span className="font-heading text-2xl font-bold tracking-tight text-foreground">
          {value}
        </span>
        {delta && (
          <span className={cn('pb-0.5 text-xs font-medium', deltaColorMap[deltaType])}>
            {delta}
          </span>
        )}
      </div>
    </GlassCard>
  )
)
MetricCard.displayName = 'MetricCard'

export { MetricCard }
export default MetricCard
