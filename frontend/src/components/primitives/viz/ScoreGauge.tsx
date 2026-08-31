import { cn } from '@/lib/utils'

interface ScoreGaugeProps {
  score: number
  maxScore?: number
  size?: number
  label?: string
  className?: string
}

export default function ScoreGauge({ score, maxScore = 100, size = 120, label, className }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(score, maxScore))
  const percentage = clamped / maxScore
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - percentage * circumference

  const color =
    clamped >= 75 ? 'stroke-mint' : clamped >= 50 ? 'stroke-amber' : 'stroke-crimson'
  const textColor =
    clamped >= 75 ? 'text-mint' : clamped >= 50 ? 'text-amber' : 'text-crimson'

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(color, 'transition-[stroke-dashoffset] duration-700 ease-out')}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-heading text-2xl font-bold tabular-nums', textColor)}>
            {clamped}
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground font-medium">{label}</span>}
    </div>
  )
}
