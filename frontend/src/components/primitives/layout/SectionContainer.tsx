import { type ReactNode, type ElementType, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SectionContainerProps {
  children: ReactNode
  className?: string
  as?: ElementType
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'max-w-5xl',
  md: 'max-w-6xl',
  lg: 'max-w-7xl',
}

const SectionContainer = forwardRef<HTMLElement, SectionContainerProps>(
  ({ children, className, as: Tag = 'div', size = 'lg', ...props }, ref) => (
    <Tag
      ref={ref}
      className={cn(sizeMap[size], 'mx-auto w-full px-4 sm:px-6 lg:px-8', className)}
      {...props}
    >
      {children}
    </Tag>
  )
)
SectionContainer.displayName = 'SectionContainer'

export { SectionContainer }
export default SectionContainer
