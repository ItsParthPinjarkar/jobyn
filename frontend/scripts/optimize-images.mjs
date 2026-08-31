/**
 * optimize-images.mjs
 * Compresses og-image.png and logo.png in the dist/ output folder after build.
 * Targets:
 *   - og-image.png: < 100KB (resize to 1200x630)
 *   - logo.png:     < 50KB  (resize to 256x256)
 */
import sharp from "sharp";
import { existsSync, statSync, writeFileSync } from "fs";
import { resolve, join } from "path";

const DIST = resolve("dist");

const targets = [
  {
    name: "og-image.png",
    width: 1200,
    height: 630,
    maxSizeKB: 100,
    quality: 80,
  },
  {
    name: "logo.png",
    width: 256,
    height: 256,
    maxSizeKB: 50,
    quality: 80,
  },
];

async function optimizeImage({ name, width, height, maxSizeKB, quality }) {
  const inputPath = join(DIST, name);
  if (!existsSync(inputPath)) {
    console.log(`[optimize-images] SKIP: ${name} not found in dist/`);
    return;
  }

  const original = await sharp(inputPath).metadata();
  const originalSize = statSync(inputPath).size;
  console.log(
    `[optimize-images] ${name}: ${original.width}x${original.height}, ${(originalSize / 1024).toFixed(1)}KB`
  );

  // Resize and compress
  let buffer = await sharp(inputPath)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
    })
    .png({ quality, compressionLevel: 9, palette: true })
    .toBuffer();

  // If still too large, reduce quality progressively
  let currentQuality = quality;
  while (buffer.length > maxSizeKB * 1024 && currentQuality > 40) {
    currentQuality -= 10;
    buffer = await sharp(inputPath)
      .resize(width, height, {
        fit: "cover",
        position: "centre",
      })
      .png({ quality: currentQuality, compressionLevel: 9, palette: true })
      .toBuffer();
  }

  // If PNG palette mode still too large, try converting to WebP
  if (buffer.length > maxSizeKB * 1024) {
    const webpName = name.replace(".png", ".webp");
    const webpBuffer = await sharp(inputPath)
      .resize(width, height, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 75 })
      .toBuffer();

    writeFileSync(join(DIST, webpName), webpBuffer);
    console.log(
      `[optimize-images] ${webpName}: ${(webpBuffer.length / 1024).toFixed(1)}KB (WebP fallback)`
    );
  }

  writeFileSync(inputPath, buffer);
  const newSize = buffer.length;
  const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
  console.log(
    `[optimize-images] ${name}: ${(newSize / 1024).toFixed(1)}KB (${savings}% savings)`
  );
}

async function main() {
  console.log("[optimize-images] Compressing images in dist/...");
  for (const target of targets) {
    await optimizeImage(target);
  }
  console.log("[optimize-images] Done.");
}

main().catch((err) => {
  console.error("[optimize-images] Error:", err);
  process.exit(1);
});
