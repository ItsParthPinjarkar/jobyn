import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  lines?: number
  className?: string
  variant?: 'text' | 'card' | 'metric'
}

export default function LoadingSkeleton({ lines = 3, className, variant = 'text' }: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn('rounded-lg bg-muted/50 animate-pulse', className)}>
        <div className="h-32 w-full rounded-lg bg-muted/30" />
      </div>
    )
  }

  if (variant === 'metric') {
    return (
      <div className={cn('flex items-center gap-3 p-4', className)}>
        <div className="h-10 w-10 rounded-lg bg-muted/50 animate-pulse shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-20 bg-muted/50 animate-pulse rounded" />
          <div className="h-3 w-32 bg-muted/30 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-9/12', 'w-2/3']

  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-3.5 bg-muted/50 animate-pulse rounded',
            widths[i % widths.length],
          )}
        />
      ))}
    </div>
  )
}
