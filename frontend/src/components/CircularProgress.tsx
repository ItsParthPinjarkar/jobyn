import { motion } from 'framer-motion'

interface Props {
  pct: number
  size?: number
  stroke?: number
  color?: string
  label?: string
}

export default function CircularProgress({ pct, size = 120, stroke = 10, color = 'var(--primary)', label }: Props) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ? `${label}: ${pct}%` : `Progress: ${pct}%`}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="currentColor"
          className="text-muted/30"
          strokeWidth={stroke}
        />
        {/* Fill */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {/* Centre label */}
      <div className="absolute flex flex-col items-center justify-center">
        <motion.span
          className="font-heading text-foreground"
          style={{ fontSize: size * 0.22, fontWeight: 800, letterSpacing: '-1px' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {pct}%
        </motion.span>
        {label && (
          <span className="text-muted-foreground mt-0.5" style={{ fontSize: size * 0.09 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
