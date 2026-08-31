import { type ReactNode, forwardRef, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface SpotlightCardProps {
  children: ReactNode
  className?: string
}

const SpotlightCard = forwardRef<HTMLDivElement, SpotlightCardProps>(
  ({ children, className, ...props }, ref) => {
    const innerRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isHovered, setIsHovered] = useState(false)

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!innerRef.current) return
      const rect = innerRef.current.getBoundingClientRect()
      setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }, [])

    const mergedRef = (node: HTMLDivElement | null) => {
      ;(innerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    }

    return (
      <div
        ref={mergedRef}
        className={cn(
          'relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-200',
          className
        )}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {isHovered && (
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(0, 242, 254, 0.04), transparent 40%)`,
            }}
          />
        )}
        <div className="relative z-10">{children}</div>
      </div>
    )
  }
)
SpotlightCard.displayName = 'SpotlightCard'

export { SpotlightCard }
export default SpotlightCard
