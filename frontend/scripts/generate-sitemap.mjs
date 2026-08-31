/**
 * Generate public/sitemap.xml from static routes + blog posts.
 * Runs in `prebuild` so new blog posts are always in the sitemap without
 * hand-editing. Parses src/data/blog-posts.ts as text (no TS import needed).
 *
 * Usage: node scripts/generate-sitemap.mjs
 */

import { readFile, writeFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = 'https://getjobyn.pages.dev'
const TODAY = new Date().toISOString().slice(0, 10)

// Static, indexable routes (auth-gated app routes are intentionally excluded).
const STATIC = [
  { path: '/', changefreq: 'weekly', priority: '1.0', lastmod: TODAY },
  { path: '/quick-score', changefreq: 'monthly', priority: '0.9', lastmod: TODAY },
  { path: '/blog', changefreq: 'weekly', priority: '0.8', lastmod: TODAY },
  { path: '/docs', changefreq: 'monthly', priority: '0.7', lastmod: TODAY },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3', lastmod: TODAY },
  { path: '/terms', changefreq: 'yearly', priority: '0.3', lastmod: TODAY },
]

function urlEntry({ path, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${BASE}${path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n')
}

async function main() {
  const src = await readFile(resolve(__dirname, '../src/data/blog-posts.ts'), 'utf-8')

  // Each post object has `slug: '...'` followed by `date: '...'`.
  const postRe = /slug:\s*['"]([^'"]+)['"][\s\S]*?date:\s*['"]([^'"]+)['"]/g
  const posts = []
  let m
  while ((m = postRe.exec(src)) !== null) {
    posts.push({ path: `/blog/${m[1]}`, lastmod: m[2], changefreq: 'monthly', priority: '0.6' })
  }

  const entries = [...STATIC, ...posts].map(urlEntry).join('\n')
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries +
    '\n</urlset>\n'

  await writeFile(resolve(__dirname, '../public/sitemap.xml'), xml, 'utf-8')
  console.log(`[sitemap] ${STATIC.length} static + ${posts.length} blog posts = ${STATIC.length + posts.length} URLs`)
}

main().catch((err) => {
  console.error('[sitemap] Failed:', err.message)
  process.exit(1)
})
