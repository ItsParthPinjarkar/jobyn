import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Problem {
  id: number
  title: string
  slug: string
  difficulty: string
  skill_tags: string[]
}

interface ProblemCardProps {
  problem: Problem
  onClick: () => void
}

const DIFFICULTY_VARIANT: Record<string, 'secondary' | 'outline' | 'destructive'> = {
  Easy: 'secondary',
  Medium: 'outline',
  Hard: 'destructive',
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-[#10B981]',
  Medium: 'text-[#F59E0B]',
  Hard: 'text-[#EF4444]',
}

export default function ProblemCard({ problem, onClick }: ProblemCardProps) {
  return (
    <Card className={cn('premium-hover-card cursor-pointer')} onClick={onClick}>
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-heading truncate text-base font-medium text-foreground">
            {problem.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={DIFFICULTY_VARIANT[problem.difficulty] ?? 'outline'}
              className={cn('text-xs', DIFFICULTY_COLOR[problem.difficulty])}
            >
              {problem.difficulty}
            </Badge>
            {problem.skill_tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0">
          Solve
        </Button>
      </CardContent>
    </Card>
  )
}
