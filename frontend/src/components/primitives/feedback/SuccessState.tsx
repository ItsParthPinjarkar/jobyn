import { CheckCircle2 } from 'lucide-react'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SuccessStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function SuccessState({ title, description, action, className }: SuccessStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <CheckCircle2 className="h-12 w-12 text-mint/80" strokeWidth={1.5} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground max-w-[280px]">{description}</p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
