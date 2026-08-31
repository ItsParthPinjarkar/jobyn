import { type ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface GridSystemProps {
  children: ReactNode
  className?: string
  cols?: Partial<Record<'default' | 'sm' | 'md' | 'lg' | 'xl', number>>
  gap?: number
}

const colClassMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
}

function buildColClasses(cols: GridSystemProps['cols']): string {
  if (!cols) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  const parts: string[] = []
  if (cols.default) parts.push(colClassMap[cols.default])
  if (cols.sm) parts.push(`sm:${colClassMap[cols.sm]}`)
  if (cols.md) parts.push(`md:${colClassMap[cols.md]}`)
  if (cols.lg) parts.push(`lg:${colClassMap[cols.lg]}`)
  if (cols.xl) parts.push(`xl:${colClassMap[cols.xl]}`)
  return parts.join(' ') || 'grid-cols-1'
}

const GridSystem = forwardRef<HTMLDivElement, GridSystemProps>(
  ({ children, className, cols, gap = 4, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('grid', buildColClasses(cols), `gap-${gap}`, className)}
      {...props}
    >
      {children}
    </div>
  )
)
GridSystem.displayName = 'GridSystem'

export { GridSystem }
export default GridSystem
