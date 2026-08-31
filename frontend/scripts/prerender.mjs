/**
 * Pre-render public pages to static HTML for SEO.
 * Runs after `vite build` — spins up a local server, navigates to each
 * public route with Puppeteer, captures the rendered HTML, and writes
 * it to dist/ so Googlebot sees real content.
 *
 * Usage: node scripts/prerender.mjs
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve as pathResolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import puppeteer from 'puppeteer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = pathResolve(__dirname, '../dist')

// Flat <route>.html files: Cloudflare Pages serves `quick-score.html` at
// `/quick-score` (no trailing slash), matching the sitemap, canonical tags,
// and internal <Link>s. `<route>/index.html` would instead serve at
// `/quick-score/` and 308-redirect the no-slash URL.
const ROUTES = [
  { path: '/', file: 'index.html' },
  { path: '/privacy', file: 'privacy.html' },
  { path: '/terms', file: 'terms.html' },
  { path: '/docs', file: 'docs.html' },
  { path: '/quick-score', file: 'quick-score.html' },
  { path: '/blog', file: 'blog.html' },
]

// Blog posts (/blog/<slug>) must be prerendered too, otherwise Cloudflare's
// SPA fallback serves them the homepage shell — whose static canonical points
// to `/`, so Google dedupes every post to the homepage and drops them.
// Slugs come from the same source the sitemap uses, parsed as text.
async function blogRoutes() {
  const src = await readFile(pathResolve(__dirname, '../src/data/blog-posts.ts'), 'utf-8')
  const slugRe = /slug:\s*['"]([^'"]+)['"]/g
  const routes = []
  let m
  while ((m = slugRe.exec(src)) !== null) {
    // Flat file dist/blog/<slug>.html → served at /blog/<slug> (no trailing slash).
    routes.push({ path: `/blog/${m[1]}`, file: `blog/${m[1]}.html` })
  }
  return routes
}

const MIME_TYPES = {
  html: 'text/html',
  js: 'application/javascript',
  css: 'text/css',
  png: 'image/png',
  svg: 'image/svg+xml',
  json: 'application/json',
  wasm: 'application/wasm',
  ico: 'image/x-icon',
}

// Tiny static file server for dist/
function serveDist() {
  return new Promise((resolveServer) => {
    const server = createServer(async (req, res) => {
      const urlPath = (req.url || '/').split('?')[0]
      let filePath = pathResolve(DIST, '.' + urlPath)

      // If the path doesn't have an extension, serve index.html (SPA fallback)
      if (!urlPath.includes('.')) {
        filePath = pathResolve(DIST, 'index.html')
      }

      try {
        const data = await readFile(filePath)
        const ext = filePath.split('.').pop()
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
        res.end(data)
      } catch {
        // SPA fallback
        const fallback = await readFile(pathResolve(DIST, 'index.html'))
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(fallback)
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolveServer({ server, port })
    })
  })
}

async function prerender() {
  console.log('[prerender] Starting...')

  const { server, port } = await serveDist()
  const baseUrl = `http://127.0.0.1:${port}`

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  const routes = [...ROUTES, ...await blogRoutes()]

  for (const route of routes) {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })

    const url = `${baseUrl}${route.path}`
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

    // Wait for React to mount
    await page.waitForSelector('#root > *', { timeout: 10000 }).catch(() => {
      console.log(`[prerender] Warning: #root empty for ${route.path}`)
    })

    // Small delay for any lazy content
    await new Promise(r => setTimeout(r, 500))

    const html = await page.content()

    // Ensure directory exists, then write
    const outPath = pathResolve(DIST, route.file)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, html, 'utf-8')
    console.log(`[prerender] ${route.file} — ${(html.length / 1024).toFixed(1)}KB`)

    await page.close()
  }

  await browser.close()
  server.close()
  console.log('[prerender] Done —', routes.length, 'pages pre-rendered')
}

prerender().catch(err => {
  console.error('[prerender] Failed:', err.message)
  process.exit(1)
})
