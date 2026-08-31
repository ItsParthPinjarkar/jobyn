import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title: string
  description: string
  canonical?: string
  ogImage?: string
  ogType?: string
  /** @deprecated Google ignores the keywords meta tag; accepted for back-compat but no longer rendered. */
  keywords?: string
  /** Emit `<meta name="robots" content="noindex, follow">` — use on 404 and other non-indexable pages. */
  noindex?: boolean
}

export default function SEO({
  title,
  description,
  canonical,
  ogImage = '/og-image.png',
  ogType = 'website',
  noindex = false,
}: SEOProps) {
  const SITE = 'https://getjobyn.pages.dev'
  const fullTitle = title.includes('Jobyn') ? title : `${title} — Jobyn`
  const canonicalUrl = canonical || `${SITE}${window.location.pathname}`
  // og:image / twitter:image MUST be absolute — crawlers (Google, Facebook,
  // LinkedIn, WhatsApp) drop relative image URLs, so the link preview shows no
  // image. Resolve any relative path against the canonical origin.
  const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${SITE}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`
  const isDefaultOg = ogImageUrl === `${SITE}/og-image.png`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:site_name" content="Jobyn" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:secure_url" content={ogImageUrl} />
      <meta property="og:image:alt" content={fullTitle} />
      {isDefaultOg && <meta property="og:image:type" content="image/png" />}
      {isDefaultOg && <meta property="og:image:width" content="1200" />}
      {isDefaultOg && <meta property="og:image:height" content="630" />}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:image:alt" content={fullTitle} />
    </Helmet>
  )
}
