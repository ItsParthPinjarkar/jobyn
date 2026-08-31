import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="16" height="16" rx="3" stroke="#3B82F6" strokeWidth="1.5" />
        <path d="M7 8H15M7 11H12M7 14H14" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: 'Resume Insights',
    desc: 'Deep ATS scanning, format validation, and automated skill extraction in under five seconds.',
    span: 'wide',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="#8B5CF6" strokeWidth="1.5" />
        <path d="M8 11L10 13L14 9" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Career Matching',
    desc: 'Map your profile against 7 engineering career tracks with precision scoring.',
    span: 'normal',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 17L4 11L8 7L12 11L16 5L18 7" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="17" r="1.5" fill="#22D3EE" />
      </svg>
    ),
    title: 'Skill Tracking',
    desc: 'Visualize growth across technical domains with real-time progress metrics.',
    span: 'normal',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 5H18M4 11H14M4 17H10" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="17" cy="14" r="3" stroke="#3B82F6" strokeWidth="1.5" />
      </svg>
    ),
    title: 'Study Paths',
    desc: 'Priority-ranked learning sequences built from your specific skill gaps.',
    span: 'normal',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="4" y="4" width="14" height="14" rx="3" stroke="#8B5CF6" strokeWidth="1.5" />
        <polygon points="9,8 15,11 9,14" fill="rgba(139,92,246,0.2)" stroke="#8B5CF6" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Interview Prep',
    desc: 'Voice-driven mock interviews with real-time concept grading and feedback.',
    span: 'normal',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M6 11L9 14L16 7" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="3" width="16" height="16" rx="4" stroke="#22D3EE" strokeWidth="1.5" />
      </svg>
    ),
    title: 'Project Validation',
    desc: 'GitHub audit verifies authorship, complexity, and authenticity of your work.',
    span: 'wide',
  },
]

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      id="features"
      ref={sectionRef}
      style={{
        position: 'relative',
        padding: '100px 24px',
        overflow: 'hidden',
      }}
    >
      {/* Subtle connecting background lines */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.3,
      }}>
        <svg width="100%" height="100%" viewBox="0 0 1200 600" preserveAspectRatio="none" fill="none">
          <motion.path
            d="M200 100 Q600 50 1000 150 Q800 300 400 350 Q600 450 900 500"
            stroke="rgba(59,130,246,0.08)"
            strokeWidth="1"
            fill="none"
            strokeDasharray="6 6"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : {}}
            transition={{ duration: 3, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
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
            Ecosystem
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
              margin: '0 0 16px',
            }}
          >
            One connected workspace.{' '}
            <span style={{
              background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #22D3EE)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Every tool you need.
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
              maxWidth: 520,
              margin: '0 auto',
              fontWeight: 500,
            }}
          >
            Six integrated modules that work together — each one strengthens the others.
          </motion.p>
        </div>

        {/* Feature Grid — asymmetric floating layout */}
        <div
          style={{
            display: 'grid',
            gap: 20,
          }}
          className="features-grid"
        >
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={feat.span === 'wide' ? 'feature-wide' : ''}
              style={{
                padding: 28,
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(11, 16, 32, 0.5)',
                backdropFilter: 'blur(8px)',
                cursor: 'default',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              whileHover={{
                borderColor: 'rgba(59,130,246,0.15)',
                y: -4,
              }}
            >
              {/* Hover glow */}
              <div style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59,130,246,0.08), transparent)',
                opacity: 0,
                transition: 'opacity 0.4s',
                pointerEvents: 'none',
              }} className="hover-glow" />

              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                {feat.icon}
              </div>

              <h3 style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#F8FAFC',
                margin: '0 0 8px',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '-0.01em',
              }}>
                {feat.title}
              </h3>
              <p style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: '#94A3B8',
                margin: 0,
                fontWeight: 500,
              }}>
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .features-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .feature-wide {
            grid-column: span 2;
          }
        }
        .features-grid > div:hover .hover-glow {
          opacity: 1 !important;
        }
      `}</style>
    </section>
  )
}
