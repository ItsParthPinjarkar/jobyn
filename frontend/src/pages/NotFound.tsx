import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Ghost } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import SEO from '@/components/SEO'

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center"
    >
      <SEO
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        noindex
      />
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="flex size-20 items-center justify-center rounded-2xl bg-muted/50"
      >
        <Ghost className="size-10 text-muted-foreground" />
      </motion.div>

      <div className="space-y-2">
        <h1 className="font-heading text-6xl font-bold tracking-tight text-foreground">404</h1>
        <p className="text-lg text-muted-foreground">Page not found</p>
        <p className="max-w-md text-sm text-muted-foreground/80">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <Link to="/" className={buttonVariants({ variant: "default" }) + " gap-2"}>
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
    </motion.div>
  )
}
