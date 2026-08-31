import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScoreGauge } from "@/components/primitives/viz"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ScoreCardProps {
  score: number
  maxScore?: number
  label: string
  description?: string
  trend?: { value: number; direction: "up" | "down" | "flat" }
  className?: string
}

export default function ScoreCard({
  score,
  maxScore = 100,
  label,
  description,
  trend,
  className,
}: ScoreCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 pt-2">
        <div className="relative">
          <ScoreGauge score={Math.round((score / maxScore) * 100)} size={120} />
        </div>
        {description && (
          <p className="text-center text-xs text-muted-foreground max-w-[180px]">
            {description}
          </p>
        )}
        {trend && (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              trend.direction === "up" && "bg-mint/10 text-mint",
              trend.direction === "down" && "bg-crimson/10 text-crimson",
              trend.direction === "flat" && "bg-muted text-muted-foreground"
            )}
          >
            {trend.direction === "up" && <TrendingUp className="size-3" />}
            {trend.direction === "down" && <TrendingDown className="size-3" />}
            {trend.direction === "flat" && <Minus className="size-3" />}
            {trend.direction === "up" ? "+" : ""}
            {trend.value}%
          </div>
        )}
      </CardContent>
    </Card>
  )
}
