import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Interactive product visual for the "Resume Intelligence" bento tile.
 * Shows a real screenshot of the Jobyn /quick-score page in a floating app window,
 * over a drifting aurora, with a cursor-follow spotlight on hover.
 * All motion stops under prefers-reduced-motion.
 */
export default function ResumeScanVisual() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--x', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--y', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className="group relative h-48 w-full overflow-hidden rounded-2xl bg-[#211D1A] sm:h-full sm:min-h-[220px]"
      style={{ '--x': '72%', '--y': '24%' } as React.CSSProperties}
    >
      {/* drifting aurora */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(55% 60% at 26% 18%, rgba(194,89,63,0.55), transparent 62%), radial-gradient(55% 60% at 84% 88%, rgba(15,118,110,0.5), transparent 62%)' }}
        animate={reduce ? undefined : { scale: [1, 1.12, 1], x: [0, 10, 0], y: [0, -8, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* faint dot grid */}
      <div aria-hidden className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(1px 1px at center, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      {/* cursor-follow spotlight */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(200px circle at var(--x) var(--y), rgba(255,255,255,0.16), transparent 60%)' }} />

      {/* real product screenshot in a floating app window */}
      <motion.div
        className="absolute left-1/2 top-5 w-[88%] -translate-x-1/2 overflow-hidden rounded-xl border border-white/15 bg-[#FAF8F5] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] transition-transform duration-500 group-hover:scale-[1.02]"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-1.5 border-b border-black/5 bg-white/80 px-3 py-2">
          <span className="size-1.5 rounded-full bg-[#FF5F56]" />
          <span className="size-1.5 rounded-full bg-[#FFBD2E]" />
          <span className="size-1.5 rounded-full bg-[#27C93F]" />
          <span className="ml-2 font-mono text-[8px] text-stone-400">jobyn.app/quick-score</span>
        </div>
        <img src="/product-quickscore.webp" alt="Jobyn instant placement score page" className="block w-full" loading="lazy" />
      </motion.div>

      {/* soft bottom fade so the window blends into the panel */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-[#211D1A] to-transparent" />
    </div>
  )
}
