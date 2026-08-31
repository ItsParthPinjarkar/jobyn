import { useEffect, useRef, type ReactNode } from 'react'

interface DarkThemeWrapperProps {
  children: ReactNode
}

export default function DarkThemeWrapper({ children }: DarkThemeWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Inject scoped dark theme CSS variables
    const style = document.createElement('style')
    style.textContent = `
      .dark-landing {
        --dl-bg: #060816;
        --dl-surface: #0B1020;
        --dl-surface-elevated: #111827;
        --dl-text: #F8FAFC;
        --dl-text-secondary: #94A3B8;
        --dl-text-muted: #64748B;
        --dl-accent-blue: #3B82F6;
        --dl-accent-violet: #8B5CF6;
        --dl-accent-cyan: #22D3EE;
        --dl-border: rgba(255, 255, 255, 0.06);
        --dl-border-hover: rgba(255, 255, 255, 0.12);
        --dl-glow-blue: rgba(59, 130, 246, 0.15);
        --dl-glow-violet: rgba(139, 92, 246, 0.12);
        --dl-glow-cyan: rgba(34, 211, 238, 0.1);
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="dark-landing"
      style={{
        background: 'var(--dl-bg)',
        color: 'var(--dl-text)',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated mesh gradient background */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        {/* Grid texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Ambient glow orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '60vw',
            height: '60vw',
            maxWidth: 800,
            maxHeight: 800,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'dl-drift-1 20s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '30%',
            right: '-15%',
            width: '50vw',
            height: '50vw',
            maxWidth: 700,
            maxHeight: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
            filter: 'blur(100px)',
            animation: 'dl-drift-2 25s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            left: '30%',
            width: '40vw',
            height: '40vw',
            maxWidth: 600,
            maxHeight: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)',
            filter: 'blur(90px)',
            animation: 'dl-drift-3 22s ease-in-out infinite',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
