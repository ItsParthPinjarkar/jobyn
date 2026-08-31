import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import GradientText from './GradientText'
import FloatingFragments from './FloatingFragments'

const AVATARS = [
  { initials: 'SK', bg: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' },
  { initials: 'AN', bg: 'linear-gradient(135deg, #8B5CF6, #EC4899)' },
  { initials: 'RG', bg: 'linear-gradient(135deg, #22D3EE, #3B82F6)' },
  { initials: 'PM', bg: 'linear-gradient(135deg, #10B981, #22D3EE)' },
  { initials: 'AK', bg: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
]

export default function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        paddingTop: 140,
        paddingBottom: 80,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 64,
          alignItems: 'center',
          width: '100%',
        }}
        className="lg:!grid-cols-[1.1fr_1fr]"
      >
        {/* Left — Typography */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: '#F8FAFC',
              margin: 0,
            }}
          >
            57,100 resumes trained our AI.
            <br />
            Here's what it <GradientText>learned</GradientText>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: 'clamp(15px, 1.2vw, 18px)',
              lineHeight: 1.7,
              color: '#94A3B8',
              maxWidth: 480,
              margin: 0,
              fontWeight: 500,
            }}
          >
            Generic AI gives you text. We give you a structured, tracked, verified roadmap.
            Upload your resume. See your gaps. Close them before placement season.
          </motion.p>

          {/* CTA Row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}
          >
            <a
              href="/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 600,
                color: '#F8FAFC',
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                borderRadius: 14,
                textDecoration: 'none',
                boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.boxShadow = '0 8px 32px rgba(59,130,246,0.45)'
                el.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.boxShadow = '0 4px 24px rgba(59,130,246,0.3)'
                el.style.transform = 'translateY(0)'
              }}
            >
              Get your access <ArrowRight size={16} />
            </a>
            <a
              href="#journey"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 600,
                color: '#94A3B8',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.color = '#F8FAFC'
                el.style.borderColor = 'rgba(255,255,255,0.15)'
                el.style.background = 'rgba(255,255,255,0.03)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.color = '#94A3B8'
                el.style.borderColor = 'rgba(255,255,255,0.08)'
                el.style.background = 'transparent'
              }}
            >
              Explore journey
            </a>
          </motion.div>

          {/* Social Proof + Accuracy Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                color: '#22C55E', background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8,
              }}>
                ✓ 95% ML Accuracy
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                color: '#3B82F6', background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8,
              }}>
                🔒 Resume never leaves your browser
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                color: '#8B5CF6', background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8,
              }}>
                📊 57,100 resumes analyzed
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
              Built for Indian engineering students preparing for campus placements
            </span>
          </motion.div>
        </div>

        {/* Right — Floating Fragments */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block"
        >
          <FloatingFragments />
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(to top, #060816, transparent)',
          pointerEvents: 'none',
        }}
      />

      <style>{`
        @media (min-width: 1024px) {
          .lg\\:!grid-cols-\\[1\\.1fr_1fr\\] {
            grid-template-columns: 1.1fr 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
