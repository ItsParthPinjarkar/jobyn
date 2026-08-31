import { cn } from '@/lib/utils'

interface SkillBarProps {
  skill: string
  level: number
  color?: string
  className?: string
}

export default function SkillBar({ skill, level, color, className }: SkillBarProps) {
  const clamped = Math.max(0, Math.min(100, level))
  const barColor = color ?? 'hsl(var(--primary))'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="w-28 shrink-0 text-xs font-medium text-foreground truncate">{skill}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{clamped}%</span>
    </div>
  )
}
