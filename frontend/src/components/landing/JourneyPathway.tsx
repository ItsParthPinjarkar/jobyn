import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const JOURNEY_STEPS = [
  { num: '01', title: 'Upload Resume', desc: 'Submit your resume in seconds. No signup required to get started.', icon: 'upload' },
  { num: '02', title: 'Skill Analysis', desc: 'Advanced models extract your complete profile and identify gaps instantly.', icon: 'analysis' },
  { num: '03', title: 'Gap Detection', desc: 'Expose missing capabilities directly compared to active role listings.', icon: 'gaps' },
  { num: '04', title: 'Personalized Roadmap', desc: 'Receive a custom learning path built for your specific career goals.', icon: 'roadmap' },
  { num: '05', title: 'Practice & Improve', desc: 'Mock interviews, coding challenges, and real-time feedback loops.', icon: 'practice' },
  { num: '06', title: 'Placement Ready', desc: 'Walk into interviews with verified skills and documented proof.', icon: 'ready' },
]

function StepIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? '#3B82F6' : '#64748B'
  const icons: Record<string, JSX.Element> = {
    upload: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 14V4M10 4L6 8M10 4L14 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 14V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    analysis: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.5" />
        <path d="M10 6V10L13 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    gaps: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10H17M10 3V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="10" r="3" stroke={color} strokeWidth="1.5" />
      </svg>
    ),
    roadmap: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 4H17M3 10H12M3 16H8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    practice: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <polygon points="7,4 17,10 7,16" fill={active ? 'rgba(59,130,246,0.2)' : 'none'} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    ready: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 10L8 14L16 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  }
  return icons[type] || null
}

export default function JourneyPathway() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <section
      id="journey"
      ref={sectionRef}
      style={{
        position: 'relative',
        padding: '100px 24px',
        overflow: 'hidden',
      }}
    >
      {/* Section header */}
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center', marginBottom: 64 }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#3B82F6',
            marginBottom: 16,
          }}
        >
          The Journey
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#F8FAFC',
            margin: 0,
          }}
        >
          From resume to placement,{' '}
          <span style={{
            background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            every step connected.
          </span>
        </motion.h2>
      </div>

      {/* Pathway — Horizontal on desktop, vertical on mobile */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Connection line (desktop horizontal) */}
        <div
          className="hidden md:block"
          style={{
            position: 'absolute',
            top: 48,
            left: '8%',
            right: '8%',
            height: 2,
            zIndex: 0,
          }}
        >
          {/* Base line */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 1,
          }} />
          {/* Animated energy line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #22D3EE)',
              borderRadius: 1,
              transformOrigin: 'left',
              boxShadow: '0 0 12px rgba(59,130,246,0.3)',
            }}
          />
        </div>

        {/* Steps grid */}
        <div
          style={{
            display: 'grid',
            gap: 32,
            position: 'relative',
            zIndex: 1,
          }}
          className="md:!grid-cols-6"
        >
          {JOURNEY_STEPS.map((step, i) => {
            const isHovered = hoveredIdx === i
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 16,
                  cursor: 'default',
                  position: 'relative',
                }}
              >
                {/* Node */}
                <div style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  border: `2px solid ${isHovered ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.06)'}`,
                  background: isHovered
                    ? 'rgba(59,130,246,0.08)'
                    : 'rgba(11, 16, 32, 0.6)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isHovered ? '0 0 30px rgba(59,130,246,0.15)' : 'none',
                }}>
                  <StepIcon type={step.icon} active={isHovered} />
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: isHovered ? '#3B82F6' : '#64748B',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.05em',
                    transition: 'color 0.3s',
                  }}>
                    {step.num}
                  </span>
                </div>

                {/* Label */}
                <div>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: isHovered ? '#F8FAFC' : '#94A3B8',
                    margin: '0 0 6px',
                    transition: 'color 0.3s',
                    fontFamily: 'var(--font-heading)',
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: '#64748B',
                    margin: 0,
                    maxWidth: 160,
                    fontWeight: 500,
                    opacity: isHovered ? 1 : 0.7,
                    transition: 'opacity 0.3s',
                  }}>
                    {step.desc}
                  </p>
                </div>

                {/* Hover glow pulse */}
                {isHovered && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 0.3 }}
                    transition={{ duration: 0.6 }}
                    style={{
                      position: 'absolute',
                      top: 48,
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(59,130,246,0.3), transparent)',
                      pointerEvents: 'none',
                      zIndex: -1,
                    }}
                  />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Mobile vertical connection line */}
      <style>{`
        @media (min-width: 768px) {
          .md\\:!grid-cols-6 { grid-template-columns: repeat(6, 1fr) !important; }
        }
      `}</style>
    </section>
  )
}
