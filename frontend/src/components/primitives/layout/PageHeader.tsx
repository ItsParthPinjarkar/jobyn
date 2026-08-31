import { type ReactNode, forwardRef, type ElementType } from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  icon?: LucideIcon
}

const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, actions, className, icon: Icon, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between', className)}
      {...props}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <Icon className="h-4 w-4 text-accent" />
          </div>
        )}
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="mt-3 flex items-center gap-2 sm:mt-0">{actions}</div>}
    </div>
  )
)
PageHeader.displayName = 'PageHeader'

export { PageHeader }
export default PageHeader
