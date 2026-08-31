import { motion, AnimatePresence } from 'framer-motion'
import LogoMark from '../LogoMark'

interface LoadingScreenProps {
  onComplete: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      <motion.div
        key="loading"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060816]"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
              animation: 'dl-breathe 3s ease-in-out infinite',
            }}
          />
        </div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <LogoMark size={48} />
        </motion.div>

        {/* Brand name */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <span className="font-heading text-xl font-bold tracking-tight text-[#F8FAFC]">
            Jobyn
          </span>
        </motion.div>

        {/* Energy line */}
        <motion.div
          className="relative mt-8 h-[2px] w-48 overflow-hidden rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-y-0 left-0 w-1/3 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #3B82F6, #8B5CF6, transparent)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '400%' }}
            transition={{
              duration: 1.5,
              repeat: 1,
              ease: 'easeInOut',
            }}
          />
        </motion.div>

        {/* Loading text */}
        <motion.p
          className="mt-5 text-xs font-medium tracking-wide text-[#64748B]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          Syncing your career workspace...
        </motion.p>
      </motion.div>
    </AnimatePresence>
  )
}
