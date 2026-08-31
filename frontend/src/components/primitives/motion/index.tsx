import * as React from "react"
import { motion, type HTMLMotionProps, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"

const EASE_OUT = [0.16, 1, 0.3, 1] as const

const fadeInVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: EASE_OUT },
  },
}

interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number
  children: React.ReactNode
}

function FadeIn({ delay = 0, className, children, ...props }: FadeInProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: fadeInVariants.hidden,
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.4, ease: EASE_OUT, delay },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  stagger?: number
  children: React.ReactNode
}

function StaggerContainer({
  stagger = 0.06,
  className,
  children,
  ...props
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
}

function StaggerItem({ className, children, ...props }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: EASE_OUT },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface HoverLiftProps extends React.HTMLAttributes<HTMLDivElement> {
  amount?: number
  children: React.ReactNode
}

function HoverLift({
  amount = -2,
  className,
  children,
  ...props
}: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{ y: amount }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

function GlowBorder({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-xl ring-1 ring-border transition-shadow duration-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:shadow-[0_0_20px_rgba(0,242,254,0.12)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface MagneticButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  strength?: number
  children: React.ReactNode
}

function MagneticButton({
  strength = 0.3,
  className,
  children,
  ...props
}: MagneticButtonProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [offset, setOffset] = React.useState({ x: 0, y: 0 })

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    setOffset({
      x: (e.clientX - centerX) * strength,
      y: (e.clientY - centerY) * strength,
    })
  }

  function handleMouseLeave() {
    setOffset({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={ref}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export { FadeIn, StaggerContainer, StaggerItem, HoverLift, GlowBorder, MagneticButton }
