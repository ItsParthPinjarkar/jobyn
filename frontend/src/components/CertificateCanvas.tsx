import { useRef, useEffect, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CertificateCanvasProps {
  score: number
  role: string
  userName: string
  date: string
  className?: string
}

const COLORS = {
  alabaster: '#FAF8F5',
  copper: '#A84832',
  copperLight: '#C4684F',
  walnut: '#1E1B18',
  muted: '#78716C',
  border: '#D6CFC7',
} as const

const FONTS = {
  heading: '"Clash Display", "Georgia", serif',
  body: '"Georgia", "Times New Roman", serif',
} as const

function drawCertificate(canvas: HTMLCanvasElement, props: CertificateCanvasProps) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { score, role, userName, date } = props
  const w = canvas.width
  const h = canvas.height

  // ── Background ──
  ctx.fillStyle = COLORS.alabaster
  ctx.fillRect(0, 0, w, h)

  // ── Border ──
  const borderPad = 12
  const cornerRadius = 8
  ctx.strokeStyle = COLORS.copper
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(borderPad, borderPad, w - borderPad * 2, h - borderPad * 2, cornerRadius)
  ctx.stroke()

  // ── Inner decorative border ──
  const innerPad = 24
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.roundRect(innerPad, innerPad, w - innerPad * 2, h - innerPad * 2, cornerRadius - 2)
  ctx.stroke()

  // ── Corner ornaments ──
  const ornamentSize = 18
  ctx.strokeStyle = COLORS.copperLight
  ctx.lineWidth = 1.5
  const corners = [
    [innerPad + 4, innerPad + 4],
    [w - innerPad - 4, innerPad + 4],
    [innerPad + 4, h - innerPad - 4],
    [w - innerPad - 4, h - innerPad - 4],
  ]
  corners.forEach(([cx, cy], i) => {
    const dx = i % 2 === 0 ? 1 : -1
    const dy = i < 2 ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(cx, cy + ornamentSize * dy)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx + ornamentSize * dx, cy)
    ctx.stroke()
  })

  // ── Title: "Jobyn" ──
  const centerX = w / 2
  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.copper
  ctx.font = `700 28px ${FONTS.heading}`
  ctx.fillText('Jobyn', centerX, 80)

  // ── Horizontal rule under title ──
  ctx.strokeStyle = COLORS.copper
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(centerX - 120, 100)
  ctx.lineTo(centerX + 120, 100)
  ctx.stroke()

  // ── Subtitle ──
  ctx.fillStyle = COLORS.muted
  ctx.font = `400 15px ${FONTS.body}`
  ctx.fillText('Placement Readiness Certificate', centerX, 128)

  // ── User name ──
  ctx.fillStyle = COLORS.walnut
  ctx.font = `700 36px ${FONTS.heading}`
  ctx.fillText(userName, centerX, 200)

  // ── Score ──
  ctx.fillStyle = COLORS.copper
  ctx.font = `800 72px ${FONTS.heading}`
  ctx.fillText(String(score), centerX, 300)
  ctx.font = `400 24px ${FONTS.body}`
  ctx.fillStyle = COLORS.muted
  const scoreMetrics = ctx.measureText(String(score))
  ctx.fillText('/100', centerX + scoreMetrics.width / 2 + 60, 300)

  // ── Role ──
  ctx.fillStyle = COLORS.muted
  ctx.font = `400 16px ${FONTS.body}`
  ctx.fillText(`Target Role: ${role}`, centerX, 340)

  // ── Horizontal rule above date ──
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(centerX - 160, h - 80)
  ctx.lineTo(centerX + 160, h - 80)
  ctx.stroke()

  // ── Date ──
  ctx.fillStyle = COLORS.muted
  ctx.font = `400 13px ${FONTS.body}`
  ctx.fillText(`Issued on ${date}`, centerX, h - 55)
}

const CertificateCanvas = forwardRef<HTMLCanvasElement, CertificateCanvasProps>(
  function CertificateCanvas({ score, role, userName, date, className }, ref) {
    const internalRef = useRef<HTMLCanvasElement>(null)
    const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      drawCertificate(canvas, { score, role, userName, date })
    }, [score, role, userName, date, canvasRef])

    return (
      <div className={cn(className)}>
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          style={{ width: '100%', maxWidth: 800, height: 'auto' }}
        />
      </div>
    )
  }
)

export default CertificateCanvas
