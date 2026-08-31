import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, Clock, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SEO from '../components/SEO'
import JsonLd from '../components/JsonLd'
import LogoMark from '../components/LogoMark'
import { getAllBlogPosts } from '../data/blog-posts'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
}

const CATEGORY_COLORS: Record<string, string> = {
  'Engineering': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Voice AI': 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  'Resume Tips': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Career Prep': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

export default function Blog() {
  const posts = getAllBlogPosts()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Blog — Jobyn"
        description="Insights on resume optimization, skill development, campus placements, and career readiness for engineering students."
        keywords="resume tips, campus placements, career readiness, engineering students, skill gap analysis"
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'Jobyn Blog',
          url: 'https://getjobyn.pages.dev/blog',
          blogPost: posts.map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            description: p.excerpt,
            datePublished: p.date,
            url: `https://getjobyn.pages.dev/blog/${p.slug}`,
          })),
        }}
      />

      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <div>
              <span className="font-heading text-sm font-bold tracking-tight text-foreground">Jobyn</span>
              <span className="ml-1 text-xs font-semibold uppercase tracking-widest text-primary">OS</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
            <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Sign Up <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet/5" />
        <div className="relative mx-auto max-w-4xl px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Badge variant="outline" className="mb-4 gap-1.5 border-primary/20 text-[11px] uppercase tracking-wider">
              <BookOpen className="size-3" /> Insights & Guides
            </Badge>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              The Jobyn <span className="gradient-text">Blog</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-xl mx-auto">
              Insights on resume optimization, skill development, campus placements, and career readiness for engineering students.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Post Grid */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 sm:grid-cols-2"
        >
          {posts.map((post) => (
            <motion.div key={post.slug} variants={item}>
              <Link to={`/blog/${post.slug}`} className="group block h-full">
                <Card className="premium-hover-card h-full transition-all hover:border-primary/20 hover:shadow-lg">
                  <CardContent className="flex h-full flex-col p-6">
                    {/* Category */}
                    <Badge
                      variant="outline"
                      className={`self-start mb-3 text-[10px] uppercase tracking-wider font-semibold ${CATEGORY_COLORS[post.category] || 'bg-muted text-muted-foreground'}`}
                    >
                      {post.category}
                    </Badge>

                    {/* Title */}
                    <h2 className="font-heading text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground line-clamp-3 flex-1">
                      {post.excerpt}
                    </p>

                    {/* Meta */}
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-3" />
                        {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3" />
                        {post.readTime}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Ready to level up your career?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Get an AI-powered analysis of your resume in 30 seconds.
          </p>
          <Link
            to="/quick-score"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try Free Resume Score <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
