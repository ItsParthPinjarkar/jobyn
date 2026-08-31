import { type ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ContentRailProps {
  children: ReactNode
  className?: string
  spacing?: 'compact' | 'default' | 'relaxed'
}

const spacingMap = {
  compact: 'space-y-4',
  default: 'space-y-6',
  relaxed: 'space-y-10',
}

const ContentRail = forwardRef<HTMLDivElement, ContentRailProps>(
  ({ children, className, spacing = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mx-auto max-w-3xl', spacingMap[spacing], className)}
      {...props}
    >
      {children}
    </div>
  )
)
ContentRail.displayName = 'ContentRail'

export { ContentRail }
export default ContentRail
