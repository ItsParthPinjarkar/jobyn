/**
 * Submit all sitemap URLs to IndexNow after a deploy.
 *
 * IndexNow instantly notifies Bing, Yandex, DuckDuckGo, Seznam (and any other
 * participating engine) that our pages changed — no waiting for a crawl. Google
 * does NOT consume IndexNow, so this complements (not replaces) the sitemap in
 * Google Search Console.
 *
 * Ownership is proven by a key file served at the site root:
 *   https://<host>/<KEY>.txt   (content === KEY)
 * That file lives in public/<KEY>.txt so it deploys alongside the site.
 *
 * Reads the built sitemap (dist/sitemap.xml, falling back to public/sitemap.xml),
 * derives the host from the first <loc>, and POSTs the URL list. Never fails the
 * deploy: any error is logged and the process still exits 0.
 *
 * Usage: node scripts/submit-indexnow.mjs
 */

import { readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KEY = '2c2814e9a4ad3023c9f4030e054e5531'
const ENDPOINT = 'https://api.indexnow.org/indexnow'

async function loadSitemap() {
  const candidates = [
    resolve(__dirname, '../dist/sitemap.xml'),
    resolve(__dirname, '../public/sitemap.xml'),
  ]
  for (const path of candidates) {
    try {
      return await readFile(path, 'utf-8')
    } catch {
      // try next
    }
  }
  throw new Error('No sitemap.xml found in dist/ or public/')
}

function extractUrls(xml) {
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g
  const urls = []
  let m
  while ((m = re.exec(xml)) !== null) urls.push(m[1])
  return urls
}

async function main() {
  const xml = await loadSitemap()
  const urlList = extractUrls(xml)
  if (urlList.length === 0) {
    console.warn('[indexnow] No <loc> URLs found in sitemap — nothing to submit.')
    return
  }

  const host = new URL(urlList[0]).host
  const keyLocation = `https://${host}/${KEY}.txt`

  const body = { host, key: KEY, keyLocation, urlList }

  console.log(`[indexnow] Submitting ${urlList.length} URLs for ${host} ...`)

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  })

  // IndexNow returns 200 (accepted) or 202 (accepted, pending validation).
  if (res.ok || res.status === 202) {
    console.log(`[indexnow] OK (HTTP ${res.status}) — ${urlList.length} URLs submitted.`)
  } else {
    const text = await res.text().catch(() => '')
    console.warn(`[indexnow] Non-success HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
}

main().catch((err) => {
  // Never break the deploy over a notification ping.
  console.warn('[indexnow] Skipped:', err.message)
  process.exit(0)
})
