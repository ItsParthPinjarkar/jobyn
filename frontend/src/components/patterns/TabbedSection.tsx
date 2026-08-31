import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
}

interface TabbedSectionProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
  tabClassName?: string
  contentClassName?: string
}

export default function TabbedSection({ tabs, defaultTab, className, tabClassName, contentClassName }: TabbedSectionProps) {
  const [activeId, setActiveId] = useState(defaultTab ?? tabs[0]?.id)

  return (
    <div className={cn('space-y-4', className)}>
      <div className={cn('flex gap-1 rounded-lg bg-muted/30 p-1', tabClassName)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150',
              activeId === tab.id
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className={contentClassName}>
        {tabs.find((t) => t.id === activeId)?.content}
      </div>
    </div>
  )
}
