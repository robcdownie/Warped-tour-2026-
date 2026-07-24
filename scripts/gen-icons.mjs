// Generates PWA icons (192, 512, maskable 512, apple-touch 180) and a favicon
// from the generated emblem art (docs/assets/icon-source.png — created via
// scripts/gen-art.mjs / fal.ai, committed so icons can always be re-derived).
// No remote assets at build time. Usage: npm run assets:icons
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SRC = resolve(root, 'docs/assets/icon-source.png');
const OUT = resolve(root, 'public/icons');
mkdirSync(OUT, { recursive: true });

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#0b2f6b"/>
  <path d="M 14,26 L 34,26 L 34,20 L 52,32 L 34,44 L 34,38 L 14,38 Z" fill="#ff2d78"/>
  <circle cx="44" cy="16" r="6" fill="#ffd21e"/>
</svg>`;

async function main() {
  if (!existsSync(SRC)) throw new Error(`Icon source art missing: ${SRC}`);

  // Sample the art's own background color so the maskable padding blends in.
  const { data } = await sharp(SRC).extract({ left: 4, top: 4, width: 8, height: 8 }).raw().toBuffer({ resolveWithObject: true });
  const bg = { r: data[0], g: data[1], b: data[2] };

  // Palette-quantized PNGs — flat screen-print art compresses ~4x with no
  // visible loss, which keeps the offline precache small.
  const png = { palette: true, quality: 80, compressionLevel: 9 };

  // Full-bleed app icons (the OS applies its own corner rounding).
  await sharp(SRC).resize(192, 192).png(png).toFile(resolve(OUT, 'pwa-192.png'));
  await sharp(SRC).resize(512, 512).png(png).toFile(resolve(OUT, 'pwa-512.png'));

  // Maskable: shrink the art into the safe zone and pad with its bg color.
  const inner = await sharp(SRC).resize(400, 400).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 3, background: bg } })
    .composite([{ input: inner, left: 56, top: 56 }])
    .png(png)
    .toFile(resolve(OUT, 'maskable-512.png'));

  // iOS home screen icon (no alpha).
  await sharp(SRC).resize(180, 180).flatten({ background: bg }).png(png).toFile(resolve(OUT, 'apple-touch-icon-180.png'));

  writeFileSync(resolve(OUT, 'favicon.svg'), faviconSvg);
  console.log('Icons written to', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
