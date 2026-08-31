import { cn } from '@/lib/utils'

interface InlineStatusProps {
  status: 'live' | 'checking' | 'offline' | 'error'
  label?: string
  className?: string
}

const STATUS_CONFIG = {
  live: { color: 'bg-mint', text: 'Live', pulse: false },
  checking: { color: 'bg-amber', text: 'Checking\u2026', pulse: true },
  offline: { color: 'bg-muted-foreground', text: 'Offline', pulse: false },
  error: { color: 'bg-crimson', text: 'Error', pulse: false },
} as const

export default function InlineStatus({ status, label, className }: InlineStatusProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={cn('absolute inset-0 rounded-full opacity-75 animate-ping', config.color)} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.color)} />
      </span>
      <span className="text-muted-foreground">{label ?? config.text}</span>
    </span>
  )
}
