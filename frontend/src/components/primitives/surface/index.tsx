import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MetricCardProps {
  label: string
  value: string | number
  delta?: string
  deltaType?: "positive" | "negative" | "neutral"
  icon?: React.ReactNode
  className?: string
}

function MetricCard({
  label,
  value,
  delta,
  deltaType = "neutral",
  icon,
  className,
}: MetricCardProps) {
  const deltaColor = {
    positive: "text-mint",
    negative: "text-crimson",
    neutral: "text-muted-foreground",
  }[deltaType]

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {icon && (
          <div className="text-muted-foreground [&_svg]:size-4">{icon}</div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-heading font-semibold tracking-tight">
          {value}
        </div>
        {delta && (
          <p className={cn("mt-1 text-xs font-medium", deltaColor)}>
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface GlassCardProps extends React.ComponentProps<typeof Card> {}

function GlassCard({ className, ...props }: GlassCardProps) {
  return (
    <Card
      className={cn(
        "bg-card/80 backdrop-blur-md ring-1 ring-border/50",
        className
      )}
      {...props}
    />
  )
}

interface SpotlightCardProps extends React.ComponentProps<typeof Card> {
  gradientColor?: string
}

const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(
  ({ className, gradientColor = "rgba(0,242,254,0.06)", ...props }, ref) => {
    const [mousePos, setMousePos] = React.useState({ x: 50, y: 50 })

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
      const rect = e.currentTarget.getBoundingClientRect()
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      })
    }

    return (
      <Card
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        onMouseMove={handleMouseMove}
        {...props}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 hover:opacity-100"
          style={{
            background: `radial-gradient(300px circle at ${mousePos.x}% ${mousePos.y}%, ${gradientColor}, transparent 70%)`,
          }}
        />
        {props.children}
      </Card>
    )
  }
)
SpotlightCard.displayName = "SpotlightCard"

export { MetricCard, GlassCard, SpotlightCard }
export type { MetricCardProps }
