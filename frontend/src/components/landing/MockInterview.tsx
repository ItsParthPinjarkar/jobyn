import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'

const QUESTIONS = [
  {
    role: 'Backend SDE',
    question: 'Explain the difference between optimistic and pessimistic locking in database transaction management.',
    answer: 'Optimistic locking assumes transactions can complete without conflict — it checks before committing. Pessimistic locking blocks the resource upfront, preventing concurrent updates.',
    score: 84,
    concepts: ['ACID', 'Concurrency', 'Dist. Consensus'],
  },
  {
    role: 'Frontend SDE',
    question: 'What is the Virtual DOM reconciliation algorithm in React, and how does the key prop optimize rendering?',
    answer: 'The Virtual DOM compares the virtual tree with the actual tree using diffing. The key prop helps React uniquely identify elements across renders, avoiding unnecessary DOM re-creation.',
    score: 91,
    concepts: ['Fiber', 'Diffing', 'Key Reconciliation'],
  },
  {
    role: 'Data Engineer',
    question: 'Describe how Apache Spark handles lazy evaluation and action execution in a distributed cluster.',
    answer: 'Spark builds a DAG when transformations are declared. It does not run them immediately. Only when an action is called does it optimize the graph and trigger execution.',
    score: 64,
    concepts: ['DAG Engine', 'Lazy Eval', 'Transformations'],
  },
]

function WaveformBars({ active }: { active: boolean }) {
  const barCount = 32
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      height: 48,
      justifyContent: 'center',
    }}>
      {Array.from({ length: barCount }).map((_, i) => {
        const h = Math.sin(i * 0.4) * 16 + 20
        return (
          <div
            key={i}
            style={{
              width: 3,
              borderRadius: 2,
              background: active
                ? `linear-gradient(180deg, #3B82F6, #8B5CF6)`
                : 'rgba(255,255,255,0.06)',
              height: active ? 4 : 4,
              transition: 'height 0.3s ease',
              animation: active ? `dl-waveform 1s ease-in-out infinite` : 'none',
              animationDelay: `${i * 0.05}s`,
              '--wave-h': `${h}px`,
              opacity: active ? 0.8 : 0.3,
            } as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}

function SoundBars({ active }: { active: boolean }) {
  const bars = [0.6, 1, 0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 0.6, 1, 0.5]
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 3,
      height: 24,
    }}>
      {bars.map((scale, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: active ? `${scale * 24}px` : '3px',
            borderRadius: 2,
            background: '#22D3EE',
            transition: 'height 0.2s ease',
            animation: active ? `dl-waveform 0.8s ease-in-out infinite` : 'none',
            animationDelay: `${i * 0.1}s`,
            '--wave-h': `${scale * 24}px`,
            opacity: active ? 0.6 : 0.15,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function MicPulse({ active }: { active: boolean }) {
  return (
    <div style={{
      position: 'relative',
      width: 56,
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {active && (
        <>
          <motion.div
            animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid rgba(59,130,246,0.3)',
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.3], opacity: [0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          />
        </>
      )}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: active
          ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s',
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="6" y="2" width="6" height="9" rx="3" stroke={active ? '#3B82F6' : '#64748B'} strokeWidth="1.5" />
          <path d="M4 9C4 11.2091 5.79086 13 8 13H10C12.2091 13 14 11.2091 14 9" stroke={active ? '#3B82F6' : '#64748B'} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 13V16" stroke={active ? '#3B82F6' : '#64748B'} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

export default function MockInterview() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })
  const [activeIdx, setActiveIdx] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [score, setScore] = useState(0)

  const startTyping = useCallback(() => {
    setIsTyping(true)
    setTypedText('')
    setScore(0)
    const answer = QUESTIONS[activeIdx].answer
    const targetScore = QUESTIONS[activeIdx].score
    let i = 0
    const iv = setInterval(() => {
      if (i < answer.length) {
        setTypedText(prev => prev + answer.charAt(i))
        i++
      } else {
        clearInterval(iv)
        setIsTyping(false)
      }
    }, 25)

    // Animate score
    let frame = 0
    const scoreIv = setInterval(() => {
      frame++
      const progress = frame / 40
      const eased = 1 - Math.pow(1 - progress, 3)
      setScore(Math.round(targetScore * eased))
      if (frame >= 40) clearInterval(scoreIv)
    }, 30)

    return () => { clearInterval(iv); clearInterval(scoreIv) }
  }, [activeIdx])

  return (
    <section
      id="interview"
      ref={sectionRef}
      style={{
        position: 'relative',
        padding: '100px 24px',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60vw',
        height: '40vh',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gap: 64,
            alignItems: 'center',
          }}
          className="lg:!grid-cols-2"
        >
          {/* Left — Text */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#22D3EE',
                marginBottom: 16,
              }}
            >
              Mock Interviews
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
                margin: '0 0 20px',
              }}
            >
              Practice until answers{' '}
              <br />
              <span style={{
                background: 'linear-gradient(90deg, #22D3EE, #3B82F6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                feel natural.
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: '#94A3B8',
                maxWidth: 460,
                margin: '0 0 32px',
                fontWeight: 500,
              }}
            >
              Speak your answers out loud. The simulator catches vocabulary gaps, scores concept coverage, and gives granular feedback — just like a real interviewer.
            </motion.p>

            {/* Waveform */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <WaveformBars active={isTyping} />
            </motion.div>
          </div>

          {/* Right — Interactive panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(11, 16, 32, 0.6)',
              backdropFilter: 'blur(12px)',
              overflow: 'hidden',
            }}>
              {/* Title bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(239,68,68,0.6)' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(245,158,11,0.6)' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(34,197,94,0.6)' }} />
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#64748B',
                  fontFamily: 'var(--font-mono)',
                  marginLeft: 8,
                }}>
                  interview_sim · {QUESTIONS[activeIdx].role}
                </span>
                <SoundBars active={isTyping} />
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Role tabs */}
                <div style={{
                  display: 'flex',
                  gap: 4,
                  padding: 4,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                }}>
                  {QUESTIONS.map((q, idx) => (
                    <button
                      key={q.role}
                      onClick={() => {
                        setActiveIdx(idx)
                        setTypedText('')
                        setIsTyping(false)
                        setScore(0)
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '-0.01em',
                        color: activeIdx === idx ? '#F8FAFC' : '#64748B',
                        background: activeIdx === idx ? 'rgba(59,130,246,0.1)' : 'transparent',
                        border: activeIdx === idx ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {q.role}
                    </button>
                  ))}
                </div>

                {/* Mic + Question */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <MicPulse active={isTyping} />
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#64748B',
                      margin: '0 0 8px',
                    }}>
                      Topic Challenge
                    </p>
                    <p style={{
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.6,
                      color: '#CBD5E1',
                      margin: 0,
                    }}>
                      {QUESTIONS[activeIdx].question}
                    </p>
                  </div>
                </div>

                {/* Transcription area */}
                <div style={{
                  minHeight: 80,
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.04)',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <p style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: '#94A3B8',
                    margin: 0,
                    fontWeight: 500,
                    fontStyle: typedText ? 'normal' : 'italic',
                  }}>
                    {typedText || 'Press simulate to preview voice analysis...'}
                    {isTyping && (
                      <span style={{
                        display: 'inline-block',
                        width: 2,
                        height: 14,
                        background: '#3B82F6',
                        marginLeft: 2,
                        verticalAlign: 'text-bottom',
                        animation: 'dl-pulse-glow 1s ease-in-out infinite',
                      }} />
                    )}
                  </p>
                </div>

                {/* Score + Concepts */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B', margin: '0 0 4px' }}>
                      Evaluation Score
                    </p>
                    <p style={{
                      fontSize: 28,
                      fontWeight: 800,
                      fontFamily: 'var(--font-heading)',
                      color: score > 0 ? '#3B82F6' : '#64748B',
                      margin: 0,
                      lineHeight: 1,
                      transition: 'color 0.3s',
                    }}>
                      {score > 0 ? `${score}%` : '--'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: '60%' }}>
                    {QUESTIONS[activeIdx].concepts.map(c => (
                      <span
                        key={c}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#22D3EE',
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid rgba(34,211,238,0.2)',
                          background: 'rgba(34,211,238,0.05)',
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Simulate button */}
                <button
                  onClick={startTyping}
                  disabled={isTyping}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: isTyping ? '#64748B' : '#F8FAFC',
                    background: isTyping ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.1)',
                    border: `1px solid ${isTyping ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.2)'}`,
                    borderRadius: 12,
                    cursor: isTyping ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isTyping) {
                      e.currentTarget.style.background = 'rgba(59,130,246,0.15)'
                      e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isTyping) {
                      e.currentTarget.style.background = 'rgba(59,130,246,0.1)'
                      e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <polygon points="4,2 12,7 4,12" fill="currentColor" />
                  </svg>
                  {isTyping ? 'Analyzing voice patterns...' : 'Simulate voice practice input'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .lg\\:!grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </section>
  )
}
