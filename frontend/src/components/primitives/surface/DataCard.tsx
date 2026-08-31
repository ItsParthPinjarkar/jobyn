import { type ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { GlassCard } from './GlassCard'
import { Separator } from '@/components/ui/separator'

interface DataCardProps {
  title?: string
  headerAction?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

const DataCard = forwardRef<HTMLDivElement, DataCardProps>(
  ({ title, headerAction, children, footer, className, ...props }, ref) => (
    <GlassCard ref={ref} className={cn('flex flex-col gap-0 p-0', className)} {...props}>
      {title && (
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
          <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
          {headerAction}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <>
          <Separator className="bg-border/50" />
          <div className="px-5 py-3">{footer}</div>
        </>
      )}
    </GlassCard>
  )
)
DataCard.displayName = 'DataCard'

export { DataCard }
export default DataCard
