import { type ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface FloatingPanelProps {
  children: ReactNode
  className?: string
}

const FloatingPanel = forwardRef<HTMLDivElement, FloatingPanelProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-popover p-4 shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
FloatingPanel.displayName = 'FloatingPanel'

export { FloatingPanel }
export default FloatingPanel
