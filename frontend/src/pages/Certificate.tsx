import { useNavigate } from 'react-router-dom'
import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useResume } from '../context/ResumeContext'
import { useAuth } from '../context/AuthContext'
import AuthRequiredPrompt from '../components/AuthRequiredPrompt'
import { Award, Download, Link2, Share2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CertificateCanvas from '../components/CertificateCanvas'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
}

export default function Certificate() {
  const navigate = useNavigate()
  const { analysis } = useResume()
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `jobyn-certificate-${analysis?.role?.replace(/\s+/g, '-').toLowerCase() ?? 'score'}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [analysis?.role])

  const handleCopyLink = useCallback(async () => {
    const url = window.location.origin + '/certificate'
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // fallback: do nothing
    }
  }, [])

  const shareMessage = `I scored ${analysis?.final_score ?? 0}% readiness for ${analysis?.role ?? 'Software Engineer'} on Jobyn! Check out your placement readiness score.`

  const handleWhatsApp = useCallback(() => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')
  }, [shareMessage])

  const handleLinkedIn = useCallback(() => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`, '_blank')
  }, [])

  // Locked state
  if (!user) {
    return <AuthRequiredPrompt feature="Readiness Certificate" />
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Award className="size-7 text-primary" />
        </div>
        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          Generate Your Certificate
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          Upload and analyze your resume first to generate a shareable readiness certificate.
        </p>
        <Button size="lg" className="mt-6 gap-2" onClick={() => navigate('/resume-analyzer')}>
          <Award className="size-4" /> Analyze Resume First
        </Button>
      </div>
    )
  }

  const score = analysis.final_score
  const role = analysis.role
  const userName = user?.name ?? 'Engineer'
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Your <span className="gradient-text">Certificate</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your placement readiness achievement with recruiters and peers.
        </p>
      </motion.div>

      {/* Certificate Preview */}
      <motion.div variants={item}>
        <Card className="premium-hover-card relative overflow-hidden">
          <CardContent className="flex flex-col items-center py-8">
            <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border/50 shadow-lg">
              <CertificateCanvas
                ref={canvasRef}
                score={score}
                role={role}
                userName={userName}
                date={date}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Share Actions */}
      <motion.div variants={item}>
        <Card className="premium-hover-card">
          <CardContent className="py-5">
            <div className="mb-3 flex items-center gap-2">
              <Share2 className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Share Your Certificate</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Button variant="outline" className="gap-2" onClick={handleDownload}>
                <Download className="size-4" /> Download PNG
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleCopyLink}>
                <Link2 className="size-4" /> Copy Link
              </Button>
              <Button variant="outline" className="gap-2 text-green-600 hover:text-green-700" onClick={handleWhatsApp}>
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                WhatsApp
              </Button>
              <Button variant="outline" className="gap-2 text-blue-600 hover:text-blue-700" onClick={handleLinkedIn}>
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                LinkedIn
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
