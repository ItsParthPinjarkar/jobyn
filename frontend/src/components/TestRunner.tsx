import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TestCase {
  passed: boolean
  actual?: string
  expected?: string
  error?: string
}

interface TestRunnerProps {
  results: TestCase[]
  status: string
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  Accepted: { label: 'Accepted', variant: 'default' },
  'Wrong Answer': { label: 'Wrong Answer', variant: 'destructive' },
  'Runtime Error': { label: 'Runtime Error', variant: 'destructive' },
  'Time Limit Exceeded': { label: 'Time Limit Exceeded', variant: 'outline' },
  'Compile Error': { label: 'Compile Error', variant: 'destructive' },
}

const STATUS_BADGE_COLOR: Record<string, string> = {
  Accepted: 'text-[#10B981]',
  'Wrong Answer': '',
  'Runtime Error': '',
  'Time Limit Exceeded': 'text-[#F59E0B]',
  'Compile Error': '',
}

export default function TestRunner({ results, status }: TestRunnerProps) {
  const passedCount = results.filter((r) => r.passed).length
  const totalCount = results.length
  const statusCfg = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant={statusCfg.variant}
            className={cn('text-xs', STATUS_BADGE_COLOR[status])}
          >
            {statusCfg.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {passedCount}/{totalCount} test cases passed
          </span>
        </div>
      </div>

      {/* Test cases */}
      <div className="space-y-2">
        {results.map((tc, i) => (
          <Card key={i}>
            <CardContent className="flex items-start gap-3 pt-4">
              {tc.passed ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#10B981]" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-[#EF4444]" />
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm font-medium">
                  Test Case {i + 1}
                </p>
                {!tc.passed && (
                  <div className="space-y-1">
                    {tc.expected !== undefined && (
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 text-xs text-muted-foreground">Expected:</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                          {tc.expected}
                        </code>
                      </div>
                    )}
                    {tc.actual !== undefined && (
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 text-xs text-muted-foreground">Actual:</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-destructive">
                          {tc.actual}
                        </code>
                      </div>
                    )}
                    {tc.error && (
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 text-xs text-muted-foreground">Error:</span>
                        <code className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-xs text-destructive">
                          {tc.error}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
