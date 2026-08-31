import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useResume } from '../context/ResumeContext'
import { Button } from '@/components/ui/button'
import { ArrowRight, LogIn, Upload } from 'lucide-react'

interface Props {
  icon: React.ReactNode
  title: string
  description: string
}

export default function AnalysisRequired({ icon, title, description }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { analysis } = useResume()

  // Already has analysis — shouldn't be shown, but just in case
  if (analysis) return null

  // Not logged in → login/signup prompt
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-2xl bg-muted p-4">{icon}</div>
        <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/signup')} className="gap-2">
            Sign Up Free <ArrowRight className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('/login')} className="gap-2">
            <LogIn className="size-4" /> Login
          </Button>
        </div>
      </div>
    )
  }

  // Logged in but no analysis → upload resume prompt
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="rounded-2xl bg-muted p-4">{icon}</div>
      <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <Button onClick={() => navigate('/resume-analyzer')} className="gap-2">
        <Upload className="size-4" /> Analyze Your Resume Now
      </Button>
    </div>
  )
}
