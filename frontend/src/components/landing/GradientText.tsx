import { useRef, type ElementType } from 'react'
import { motion, useInView } from 'framer-motion'

interface GradientTextProps {
  children: React.ReactNode
  className?: string
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p'
  delay?: number
}

export default function GradientText({
  children,
  className = '',
  delay = 0,
}: GradientTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.span
      ref={ref}
      className={`dl-shimmer-text ${className}`}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.span>
  )
}
