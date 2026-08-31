import { type ReactNode, forwardRef, Children, isValidElement, cloneElement } from 'react'
import { cn } from '@/lib/utils'

interface BentoLayoutProps {
  children: ReactNode
  className?: string
}

interface BentoItemProps {
  children: ReactNode
  className?: string
  span?: 1 | 2 | 3 | 4
}

const spanColMap: Record<number, string> = {
  1: 'col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
}

function BentoItem({ children, className, span = 1 }: BentoItemProps) {
  return (
    <div className={cn(spanColMap[span], className)}>
      {children}
    </div>
  )
}

const BentoLayout = forwardRef<HTMLDivElement, BentoLayoutProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
BentoLayout.displayName = 'BentoLayout'

export { BentoLayout, BentoItem }
export default BentoLayout
