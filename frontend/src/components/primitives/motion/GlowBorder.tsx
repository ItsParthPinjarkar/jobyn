import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface GlowBorderProps {
  children: ReactNode
  className?: string
}

export default function GlowBorder({ children, className }: GlowBorderProps) {
  return (
    <div
      className={cn(
        'transition-shadow duration-200',
        'focus-within:ring-2 focus-within:ring-primary/30',
        'active:ring-2 active:ring-primary/30',
        className,
      )}
    >
      {children}
    </div>
  )
}
