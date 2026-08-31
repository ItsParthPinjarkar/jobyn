/**
 * Generate a real favicon.ico from public/logo.png.
 *
 * Why: Google (and browsers) probe `/favicon.ico` at the site root. On this
 * SPA, an unmatched `/favicon.ico` falls through to index.html and returns
 * HTML, so there is no crawlable icon at that path — Google can end up showing
 * a stale/generic favicon. Emitting a real .ico removes that ambiguity.
 *
 * sharp cannot encode .ico, but the ICO container can embed a PNG payload
 * directly (Vista+), which every modern browser and Googlebot accept. So we
 * resize the logo to 32×32 PNG with sharp and wrap it in a minimal ICO header.
 *
 * Runs in `prebuild` (alongside generate-sitemap) so it always tracks the logo.
 *
 * Usage: node scripts/generate-favicon.mjs
 */

import { readFile, writeFile } from 'fs/promises'
import { resolve as pathResolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = pathResolve(__dirname, '../public')
const SOURCE = pathResolve(PUBLIC, 'logo.png')
const OUT = pathResolve(PUBLIC, 'favicon.ico')

const ICON_SIZE = 32
const HEADER_SIZE = 6
const DIR_ENTRY_SIZE = 16
const IMAGE_OFFSET = HEADER_SIZE + DIR_ENTRY_SIZE

/** Wrap a PNG buffer in a single-image ICO container. */
function wrapPngInIco(png) {
  const header = Buffer.alloc(HEADER_SIZE)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = icon
  header.writeUInt16LE(1, 4) // image count

  const entry = Buffer.alloc(DIR_ENTRY_SIZE)
  entry.writeUInt8(ICON_SIZE % 256, 0) // width (0 means 256)
  entry.writeUInt8(ICON_SIZE % 256, 1) // height
  entry.writeUInt8(0, 2)               // palette colors
  entry.writeUInt8(0, 3)               // reserved
  entry.writeUInt16LE(1, 4)            // color planes
  entry.writeUInt16LE(32, 6)           // bits per pixel
  entry.writeUInt32LE(png.length, 8)   // size of PNG data
  entry.writeUInt32LE(IMAGE_OFFSET, 12) // offset to PNG data

  return Buffer.concat([header, entry, png])
}

async function generate() {
  const source = await readFile(SOURCE)
  const png = await sharp(source)
    .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  await writeFile(OUT, wrapPngInIco(png))
  console.log(`[favicon] favicon.ico — ${ICON_SIZE}x${ICON_SIZE}, ${(await readFile(OUT)).length} bytes`)
}

generate().catch(err => {
  console.error('[favicon] Failed:', err.message)
  process.exit(1)
})
