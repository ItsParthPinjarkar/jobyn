import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import SEO from '../components/SEO'
import LogoMark from '../components/LogoMark'
import { getBlogPost, getAllBlogPosts } from '../data/blog-posts'
import ReactMarkdown from 'react-markdown'

const CATEGORY_COLORS: Record<string, string> = {
  'Engineering': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Voice AI': 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  'Resume Tips': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Career Prep': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const post = slug ? getBlogPost(slug) : undefined

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SEO title="Post Not Found — Jobyn" description="The blog post you're looking for doesn't exist." />
        <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <LogoMark size={28} />
              <div>
                <span className="font-heading text-sm font-bold tracking-tight text-foreground">Jobyn</span>
                <span className="ml-1 text-xs font-semibold uppercase tracking-widest text-primary">OS</span>
              </div>
            </Link>
          </div>
        </nav>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground">Post not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">The blog post you're looking for doesn't exist.</p>
          <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <ArrowLeft className="size-4" /> Back to Blog
          </Link>
        </div>
      </div>
    )
  }

  const allPosts = getAllBlogPosts()
  const currentIndex = allPosts.findIndex(p => p.slug === slug)
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={post.title}
        description={post.excerpt}
        keywords={`${post.category.toLowerCase()}, campus placements, career readiness, engineering students`}
        ogType="article"
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
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-3" /> Back to Blog
          </Link>
        </div>
      </nav>

      {/* Article */}
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-3xl px-6 py-12"
      >
        {/* Meta header */}
        <div className="mb-8">
          <Badge
            variant="outline"
            className={`mb-4 text-[10px] uppercase tracking-wider font-semibold ${CATEGORY_COLORS[post.category] || 'bg-muted text-muted-foreground'}`}
          >
            <Tag className="size-3 mr-1" /> {post.category}
          </Badge>

          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl leading-tight">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" />
              {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {post.readTime}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none
          prose-headings:font-heading prose-headings:tracking-tight
          prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-muted-foreground
          prose-strong:text-foreground prose-strong:font-semibold
          prose-code:text-[13px] prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border prose-pre:rounded-xl
          prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
          prose-li:text-[15px] prose-li:leading-relaxed prose-li:text-muted-foreground
          prose-table:text-sm
          prose-th:text-left prose-th:font-semibold prose-th:text-foreground prose-th:pb-3
          prose-td:py-2 prose-td:text-muted-foreground
        ">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {/* Divider */}
        <div className="mt-12 mb-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Navigation */}
        <div className="grid gap-4 sm:grid-cols-2">
          {prevPost ? (
            <Link
              to={`/blog/${prevPost.slug}`}
              className="group rounded-xl border border-border p-5 transition-all hover:border-primary/20 hover:shadow-md"
            >
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Previous</span>
              <p className="mt-1.5 font-heading text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {prevPost.title}
              </p>
            </Link>
          ) : <div />}
          {nextPost ? (
            <Link
              to={`/blog/${nextPost.slug}`}
              className="group rounded-xl border border-border p-5 text-right transition-all hover:border-primary/20 hover:shadow-md"
            >
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Next</span>
              <p className="mt-1.5 font-heading text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {nextPost.title}
              </p>
            </Link>
          ) : <div />}
        </div>
      </motion.article>

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
            Try Free Resume Score
          </Link>
        </div>
      </section>
    </div>
  )
}
