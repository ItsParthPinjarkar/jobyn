import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface TimelineItem {
  id: string
  title: string
  description?: string
  time?: string
  icon?: ReactNode
  status?: 'completed' | 'current' | 'upcoming'
}

interface TimelineViewProps {
  items: TimelineItem[]
  className?: string
}

export default function TimelineView({ items, className }: TimelineViewProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const statusColor = item.status === 'completed' ? 'bg-mint' : item.status === 'current' ? 'bg-primary' : 'bg-muted/40'
        const borderColor = item.status === 'completed' ? 'border-mint/20' : item.status === 'current' ? 'border-primary/20' : 'border-border'

        return (
          <div key={item.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border', borderColor, statusColor + '/10')}>
                {item.icon ?? (
                  <div className={cn('h-2.5 w-2.5 rounded-full', statusColor)} />
                )}
              </div>
              {!isLast && <div className={cn('w-px flex-1 my-1', statusColor === 'bg-muted/40' ? 'bg-border' : 'bg-border/50')} />}
            </div>
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.time && <span className="text-xs text-muted-foreground">{item.time}</span>}
              </div>
              {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
