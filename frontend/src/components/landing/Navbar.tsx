import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import LogoMark from '../LogoMark'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Journey', href: '#journey' },
  { label: 'Roadmap', href: '#roadmap' },
  { label: 'Mock Interviews', href: '#mock-interview' },
  { label: 'Resources', href: '#resources' },
  { label: 'Pricing', href: '#pricing' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 2.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: scrolled ? 'rgba(6, 8, 22, 0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark size={24} />
          <span className="font-heading text-sm font-bold tracking-tight text-[#F8FAFC]">
            Jobyn
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[13px] font-medium text-[#94A3B8] transition-colors duration-200 hover:text-[#F8FAFC]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden items-center gap-4 lg:flex">
          <Link
            to="/login"
            className="text-[13px] font-medium text-[#94A3B8] transition-colors hover:text-[#F8FAFC]"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              boxShadow: '0 0 20px rgba(59,130,246,0.2), 0 0 40px rgba(139,92,246,0.1)',
            }}
          >
            Get Access <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="flex items-center justify-center lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <div className="flex flex-col gap-1.5">
            <motion.span
              className="block h-[1.5px] w-5 bg-[#F8FAFC]"
              animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
            />
            <motion.span
              className="block h-[1.5px] w-5 bg-[#F8FAFC]"
              animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
            />
            <motion.span
              className="block h-[1.5px] w-5 bg-[#F8FAFC]"
              animate={mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
            />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[rgba(255,255,255,0.06)] bg-[rgba(6,8,22,0.95)] backdrop-blur-xl lg:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F8FAFC]"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-[rgba(255,255,255,0.06)] pt-3">
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
                  onClick={() => setMobileOpen(false)}
                >
                  Get Access <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
