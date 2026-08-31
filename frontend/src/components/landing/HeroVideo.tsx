import { useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

/**
 * Hero product demo: a real recorded walkthrough of the logged-in product
 * (dashboard, skill-gap, live AI mock interview, GitHub project verification).
 * Autoplays muted + looping so it feels alive; the viewer can click to hear the
 * narration. Replaces the static readiness-gauge box in the hero.
 */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)

  const toggleSound = () => {
    const v = ref.current
    if (!v) return
    if (muted) {
      v.muted = false
      v.currentTime = 0
      void v.play()
      setMuted(false)
    } else {
      v.muted = true
      setMuted(true)
    }
  }

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-border bg-[#0A0B0F] shadow-2xl">
        <video
          ref={ref}
          src="/jobyn-hero.mp4"
          poster="/jobyn-hero-poster.png"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onEnded={() => setMuted(true)}
          className="block aspect-video w-full"
        />
      </div>

      {/* Sound toggle */}
      <button
        type="button"
        onClick={toggleSound}
        aria-label={muted ? 'Play demo with sound' : 'Mute demo'}
        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/80"
      >
        {muted ? <><Volume2 className="size-3.5" /> Play with sound</> : <><VolumeX className="size-3.5" /> Mute</>}
      </button>
    </div>
  )
}
