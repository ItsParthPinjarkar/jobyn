import { motion } from 'framer-motion'
import { Loader2, AlertTriangle, Inbox } from 'lucide-react'
import { Button } from './ui/button'

interface LoadingProps {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-4 py-20"
    >
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </motion.div>
  )
}

interface ErrorProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <h3 className="font-heading text-lg font-bold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-2">
          Try Again
        </Button>
      )}
    </motion.div>
  )
}

interface EmptyProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, subtitle, action }: EmptyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
        {icon ?? <Inbox className="size-7 text-muted-foreground" />}
      </div>
      <h3 className="font-heading text-base font-bold text-foreground">{title}</h3>
      {subtitle && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}
