import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COMMANDS = [
  { label: 'Features', href: '#features', icon: 'grid' },
  { label: 'Journey', href: '#journey', icon: 'path' },
  { label: 'Roadmap', href: '#roadmap', icon: 'map' },
  { label: 'Mock Interviews', href: '#interview', icon: 'mic' },
  { label: 'Get Access', href: '/signup', icon: 'arrow' },
  { label: 'Login', href: '/login', icon: 'user' },
]

function CommandIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    grid: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="5" rx="1" stroke="#64748B" strokeWidth="1.2" />
        <rect x="8" y="1" width="5" height="5" rx="1" stroke="#64748B" strokeWidth="1.2" />
        <rect x="1" y="8" width="5" height="5" rx="1" stroke="#64748B" strokeWidth="1.2" />
        <rect x="8" y="8" width="5" height="5" rx="1" stroke="#64748B" strokeWidth="1.2" />
      </svg>
    ),
    path: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="3" cy="7" r="2" stroke="#64748B" strokeWidth="1.2" />
        <circle cx="11" cy="7" r="2" stroke="#64748B" strokeWidth="1.2" />
        <path d="M5 7H9" stroke="#64748B" strokeWidth="1.2" />
      </svg>
    ),
    map: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 3H12M2 7H10M2 11H8" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    mic: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="4.5" y="1.5" width="5" height="7" rx="2.5" stroke="#64748B" strokeWidth="1.2" />
        <path d="M3 7C3 8.65685 4.34315 10 6 10H8C9.65685 10 11 8.65685 11 7" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M7 10V12.5" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    arrow: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 7H11M8 4L11 7L8 10" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    user: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="5" r="3" stroke="#64748B" strokeWidth="1.2" />
        <path d="M2 13C2 10.7909 4.23858 9 7 9C9.76142 9 12 10.7909 12 13" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  }
  return icons[type] || null
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Open on "/"
    if (e.key === '/' && !open && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault()
      setOpen(true)
      setQuery('')
      setSelectedIdx(0)
      return
    }

    if (!open) return

    if (e.key === 'Escape') {
      setOpen(false)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(prev => Math.max(prev - 1, 0))
      return
    }

    if (e.key === 'Enter' && filtered[selectedIdx]) {
      const cmd = filtered[selectedIdx]
      setOpen(false)
      if (cmd.href.startsWith('/')) {
        window.location.href = cmd.href
      } else {
        document.querySelector(cmd.href)?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [open, filtered, selectedIdx])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: '100%',
              maxWidth: 480,
              padding: 4,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(11, 16, 32, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5" stroke="#64748B" strokeWidth="1.5" />
                <path d="M11 11L14 14" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedIdx(0) }}
                placeholder="Search commands..."
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#F8FAFC',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <kbd style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#64748B',
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                fontFamily: 'var(--font-mono)',
              }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div style={{ padding: 8, maxHeight: 280, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', padding: 16, margin: 0 }}>
                  No results found.
                </p>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.label}
                    onClick={() => {
                      setOpen(false)
                      if (cmd.href.startsWith('/')) {
                        window.location.href = cmd.href
                      } else {
                        document.querySelector(cmd.href)?.scrollIntoView({ behavior: 'smooth' })
                      }
                    }}
                    onMouseEnter={() => setSelectedIdx(i)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: selectedIdx === i ? '#F8FAFC' : '#94A3B8',
                      background: selectedIdx === i ? 'rgba(59,130,246,0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <CommandIcon type={cmd.icon} />
                    {cmd.label}
                  </button>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '10px 16px',
              borderTop: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{ fontSize: 10, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)' }}>↑↓</kbd> navigate
              </span>
              <span style={{ fontSize: 10, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)' }}>↵</kbd> select
              </span>
              <span style={{ fontSize: 10, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)' }}>esc</kbd> close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
