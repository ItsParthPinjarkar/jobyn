import { Link } from 'react-router-dom'
import { Lock, ArrowRight, LogIn, UserPlus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'

interface AuthRequiredPromptProps {
  feature: string
  description?: string
}

export default function AuthRequiredPrompt({ feature, description }: AuthRequiredPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-primary/10">
        <Lock className="size-10 text-primary" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-foreground mb-2">{feature} Requires an Account</h2>
      <p className="max-w-md text-sm text-muted-foreground mb-8">
        {description || `Sign up for free to access ${feature.toLowerCase()} and track your placement readiness.`}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/signup" className={buttonVariants({ size: 'lg' }) + ' gap-2 rounded-full px-8 font-semibold'}>
          <UserPlus className="size-4" /> Create Free Account
        </Link>
        <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' gap-2 rounded-full px-8 font-semibold'}>
          <LogIn className="size-4" /> Login
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        No credit card required. Takes 30 seconds.
      </p>
    </div>
  )
}
