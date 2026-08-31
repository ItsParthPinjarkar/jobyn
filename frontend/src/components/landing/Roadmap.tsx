import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const ROADMAP_ITEMS = [
  { phase: 'Phase 1', title: 'Foundation Skills', desc: 'Data structures, algorithms, and core CS fundamentals.', progress: 100 },
  { phase: 'Phase 2', title: 'System Design', desc: 'Scalable architectures, distributed systems, and API design.', progress: 72 },
  { phase: 'Phase 3', title: 'Project Building', desc: 'Full-stack projects with real-world complexity and deployment.', progress: 45 },
  { phase: 'Phase 4', title: 'Interview Mastery', desc: 'Mock interviews, behavioral prep, and company-specific practice.', progress: 20 },
  { phase: 'Phase 5', title: 'Placement Ready', desc: 'Portfolio refinement, GitHub verification, and recruiter outreach.', progress: 0 },
]

export default function Roadmap() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <section
      id="roadmap"
      ref={sectionRef}
      style={{
        position: 'relative',
        padding: '100px 24px',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gap: 64,
            alignItems: 'start',
          }}
          className="lg:!grid-cols-[0.9fr_1fr]"
        >
          {/* Left — Typography */}
          <div style={{ position: 'sticky', top: 120 }}>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#8B5CF6',
                marginBottom: 16,
              }}
            >
              Roadmap
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
                margin: '0 0 24px',
              }}
            >
              Exactly what to learn.{' '}
              <br />
              <span style={{
                background: 'linear-gradient(90deg, #8B5CF6, #22D3EE)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                In the right order.
              </span>
            </motion.h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Resume-driven skill extraction', 'Gap analysis against 7 career tracks', 'Priority-ranked learning paths', 'Progress tracking with milestones'].map((text, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -16 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>
                    {text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right — Vertical path */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
            {/* Vertical connection line */}
            <div style={{
              position: 'absolute',
              left: 19,
              top: 24,
              bottom: 24,
              width: 2,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 1,
            }}>
              <motion.div
                initial={{ scaleY: 0 }}
                animate={isInView ? { scaleY: 1 } : {}}
                transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, #3B82F6, #8B5CF6, #22D3EE)',
                  borderRadius: 1,
                  transformOrigin: 'top',
                }}
              />
            </div>

            {ROADMAP_ITEMS.map((item, i) => {
              const isHovered = hoveredIdx === i
              const isActive = item.progress > 0 && item.progress < 100
              const isComplete = item.progress === 100

              return (
                <motion.div
                  key={item.phase}
                  initial={{ opacity: 0, x: 24 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    display: 'flex',
                    gap: 20,
                    padding: '24px 0',
                    cursor: 'default',
                    position: 'relative',
                  }}
                >
                  {/* Node */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: `2px solid ${isComplete ? '#22D3EE' : isActive ? '#3B82F6' : 'rgba(255,255,255,0.08)'}`,
                    background: isComplete
                      ? 'rgba(34,211,238,0.1)'
                      : isActive
                        ? 'rgba(59,130,246,0.1)'
                        : 'rgba(11, 16, 32, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isHovered
                      ? isComplete
                        ? '0 0 20px rgba(34,211,238,0.2)'
                        : '0 0 20px rgba(59,130,246,0.2)'
                      : 'none',
                    zIndex: 1,
                  }}>
                    {isComplete ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8L7 11L12 5" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: isActive ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                        animation: isActive ? 'dl-pulse-glow 2s ease-in-out infinite' : 'none',
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1,
                    padding: '8px 20px',
                    borderRadius: 16,
                    border: `1px solid ${isHovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                    background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                    transition: 'all 0.3s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: isComplete ? '#22D3EE' : isActive ? '#3B82F6' : '#64748B',
                      }}>
                        {item.phase}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isComplete ? '#22D3EE' : isActive ? '#3B82F6' : '#64748B',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {item.progress}%
                      </span>
                    </div>
                    <h3 style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: isHovered ? '#F8FAFC' : '#CBD5E1',
                      margin: '0 0 6px',
                      fontFamily: 'var(--font-heading)',
                      transition: 'color 0.3s',
                    }}>
                      {item.title}
                    </h3>
                    <p style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: '#64748B',
                      margin: '0 0 12px',
                      fontWeight: 500,
                    }}>
                      {item.desc}
                    </p>

                    {/* Progress bar */}
                    <div style={{
                      height: 3,
                      borderRadius: 2,
                      background: 'rgba(255,255,255,0.04)',
                      overflow: 'hidden',
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${item.progress}%` } : {}}
                        transition={{ duration: 1, delay: 0.5 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          height: '100%',
                          borderRadius: 2,
                          background: isComplete
                            ? 'linear-gradient(90deg, #22D3EE, #3B82F6)'
                            : 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .lg\\:!grid-cols-\\[0\\.9fr_1fr\\] { grid-template-columns: 0.9fr 1fr !important; }
        }
      `}</style>
    </section>
  )
}
