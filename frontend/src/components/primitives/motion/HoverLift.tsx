import { motion } from 'framer-motion'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface HoverLiftProps {
  children: ReactNode
  className?: string
  y?: number
}

export default function HoverLift({ children, className, y = -2 }: HoverLiftProps) {
  return (
    <motion.div
      className={cn(className)}
      whileHover={{ y, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
    >
      {children}
    </motion.div>
  )
}
