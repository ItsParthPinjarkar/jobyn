import { motion } from 'framer-motion'

interface Point { label: string; value: number }

interface Props {
  data: Point[]
  height?: number
  color?: string
}

export default function MiniLineChart({ data, height = 120, color = 'var(--primary)' }: Props) {
  if (!data.length) return null

  const W = 500
  const H = height
  const PAD = { top: 12, right: 12, bottom: 28, left: 36 }

  const values = data.map(d => d.value)
  const minV = Math.min(...values) - 5
  const maxV = Math.max(...values) + 5
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const xOf = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2)
  const yOf = (v: number) => {
    const range = maxV - minV
    return PAD.top + (range === 0 ? innerH / 2 : (1 - (v - minV) / range) * innerH)
  }

  const pts = data.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.value).toFixed(1)}`)
  const linePath = pts.join(' ')
  const areaPath = [...pts, `${xOf(data.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)}`, `${xOf(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)}`].join(' ')

  const yTicks = [minV + 5, Math.round((minV + maxV) / 2), maxV - 5]

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height, display: 'block' }}>
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(t)} y2={yOf(t)} stroke="currentColor" className="text-border" strokeWidth="1" />
            <text x={PAD.left - 6} y={yOf(t) + 4} fontSize="10" className="fill-muted-foreground" textAnchor="end">
              {Math.round(t)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <motion.polygon
          points={areaPath}
          fill={color}
          fillOpacity={0.06}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Line */}
        <motion.polyline
          points={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Dots */}
        {data.map((d, i) => (
          <motion.circle
            key={i}
            cx={xOf(i)} cy={yOf(d.value)}
            r="4"
            fill={color}
            className="stroke-background"
            strokeWidth="2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 * i, duration: 0.3 }}
          />
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={xOf(i)} y={H - 6} fontSize="10" className="fill-muted-foreground" textAnchor="middle">
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
