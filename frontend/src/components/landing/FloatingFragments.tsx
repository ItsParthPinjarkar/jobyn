import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

/* ── Micro-Panel: Progress Ring ──────────────────────────────── */
function ProgressRing() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setPct(78), 800)
    return () => clearTimeout(t)
  }, [])

  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(11, 16, 32, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      animation: 'dl-float 6s ease-in-out infinite',
    }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <motion.circle
          cx="44" cy="44" r={r} fill="none"
          stroke="url(#rg-grad)" strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
        />
        <defs>
          <linearGradient id="rg-grad" x1="0" y1="0" x2="88" y2="88">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <text x="44" y="40" textAnchor="middle" fill="#F8FAFC" fontSize="18" fontWeight="700" fontFamily="var(--font-heading)">{pct}%</text>
        <text x="44" y="55" textAnchor="middle" fill="#64748B" fontSize="8" fontWeight="600" fontFamily="var(--font-sans)" letterSpacing="0.05em">READINESS</text>
      </svg>
    </div>
  )
}

/* ── Micro-Panel: Skill Bars ─────────────────────────────────── */
function SkillBars() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const bars = [
    { label: 'Systems Design', pct: 82, color: '#22D3EE' },
    { label: 'Algorithms', pct: 74, color: '#3B82F6' },
    { label: 'Frontend', pct: 91, color: '#8B5CF6' },
    { label: 'Cloud', pct: 45, color: '#F59E0B' },
  ]

  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(11, 16, 32, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      width: 220,
      animation: 'dl-float-delayed 7s ease-in-out infinite 1s',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Skill Coverage
      </span>
      {bars.map((bar, i) => (
        <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{bar.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>{bar.pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: visible ? `${bar.pct}%` : 0 }}
              transition={{ duration: 1, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', borderRadius: 2, background: bar.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Micro-Panel: Score Metric ───────────────────────────────── */
function ScoreMetric() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const start = setTimeout(() => {
      let frame = 0
      const iv = setInterval(() => {
        frame++
        const progress = frame / 40
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.round(82.1 * eased))
        if (frame >= 40) clearInterval(iv)
      }, 30)
      return () => clearInterval(iv)
    }, 1000)
    return () => clearTimeout(start)
  }, [])

  return (
    <div style={{
      padding: '16px 20px',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(11, 16, 32, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      animation: 'dl-float 5s ease-in-out infinite 0.5s',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L12.09 7.26L18 8.27L14 12.14L14.18 18.02L10 15.77L5.82 18.02L6 12.14L2 8.27L7.91 7.26L10 2Z" fill="#3B82F6" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
          {count}%
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', letterSpacing: '0.04em', marginTop: 2 }}>
          ML Accuracy
        </div>
      </div>
    </div>
  )
}

/* ── Micro-Panel: Waveform Preview ───────────────────────────── */
function WaveformPreview() {
  const bars = [8, 16, 12, 24, 18, 28, 14, 22, 10, 20, 16, 26, 12, 18, 8]

  return (
    <div style={{
      padding: '14px 18px',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(11, 16, 32, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      animation: 'dl-float-delayed 6s ease-in-out infinite 2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#22D3EE',
          animation: 'dl-pulse-glow 2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#22D3EE', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Live Interview
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 28 }}>
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              width: 3,
              borderRadius: 2,
              background: 'linear-gradient(180deg, #3B82F6, #8B5CF6)',
              opacity: 0.7,
              animation: `dl-waveform 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.08}s`,
              '--wave-h': `${h}px`,
              height: 4,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Micro-Panel: Roadmap Snippet ────────────────────────────── */
function RoadmapSnippet() {
  const steps = [
    { label: 'Upload Resume', done: true },
    { label: 'Skill Analysis', done: true },
    { label: 'Gap Detection', done: false },
  ]

  return (
    <div style={{
      padding: '14px 18px',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(11, 16, 32, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      animation: 'dl-float 8s ease-in-out infinite 1.5s',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Your Journey
      </span>
      {steps.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: `2px solid ${s.done ? '#22D3EE' : 'rgba(255,255,255,0.12)'}`,
            background: s.done ? 'rgba(34,211,238,0.15)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {s.done && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: s.done ? '#F8FAFC' : '#64748B',
          }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────────── */
export default function FloatingFragments() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setMouse({ x, y })
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        width: '100%',
        height: 420,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Central glow */}
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      {/* Floating panels with parallax */}
      <motion.div
        animate={{ x: mouse.x * 8, y: mouse.y * 6 }}
        transition={{ type: 'spring', stiffness: 100, damping: 30 }}
        style={{ position: 'absolute', top: 0, left: '5%' }}
      >
        <ProgressRing />
      </motion.div>

      <motion.div
        animate={{ x: mouse.x * -12, y: mouse.y * 10 }}
        transition={{ type: 'spring', stiffness: 80, damping: 30 }}
        style={{ position: 'absolute', top: '15%', right: '0%' }}
      >
        <SkillBars />
      </motion.div>

      <motion.div
        animate={{ x: mouse.x * 6, y: mouse.y * -8 }}
        transition={{ type: 'spring', stiffness: 120, damping: 30 }}
        style={{ position: 'absolute', bottom: '20%', left: '0%' }}
      >
        <ScoreMetric />
      </motion.div>

      <motion.div
        animate={{ x: mouse.x * -10, y: mouse.y * -6 }}
        transition={{ type: 'spring', stiffness: 90, damping: 30 }}
        style={{ position: 'absolute', bottom: '5%', right: '10%' }}
      >
        <WaveformPreview />
      </motion.div>

      <motion.div
        animate={{ x: mouse.x * 14, y: mouse.y * 4 }}
        transition={{ type: 'spring', stiffness: 70, damping: 30 }}
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <RoadmapSnippet />
      </motion.div>

      {/* Decorative connecting lines */}
      <svg
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
        viewBox="0 0 500 420"
        fill="none"
      >
        <motion.path
          d="M120 60 C 200 100, 300 80, 380 120"
          stroke="rgba(59,130,246,0.12)"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 1, ease: 'easeInOut' }}
        />
        <motion.path
          d="M80 320 C 150 280, 280 300, 400 260"
          stroke="rgba(139,92,246,0.1)"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 1.5, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  )
}
