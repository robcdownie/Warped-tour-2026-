// Generates PWA icons (192, 512, maskable 512, apple-touch 180) and a favicon
// from a self-contained SVG. No remote assets. Usage: npm run assets:icons
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'public/icons');
mkdirSync(OUT, { recursive: true });

// Warped-inspired mark: blue field, yellow burst, hot-pink arrow, "WLB" wordmark.
function svg({ maskable = false } = {}) {
  const pad = maskable ? 64 : 24; // maskable needs safe-zone padding
  const s = 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1f5fa8"/>
      <stop offset="1" stop-color="#0b2f6b"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${maskable ? 0 : 96}" fill="url(#bg)"/>
  <g transform="translate(${pad},${pad})">
    <g transform="translate(${(s - 2 * pad) / 2},${(s - 2 * pad) / 2})">
      <!-- yellow burst -->
      <polygon points="-150,-60 -60,-110 -40,-30 60,-120 40,-20 150,-40 70,20 150,80 40,60 70,150 -20,70 -70,150 -70,40 -160,60 -80,-10"
               fill="#ffd21e" opacity="0.95"/>
      <!-- pink arrow chevron -->
      <path d="M -120,-10 L 40,-10 L 40,-60 L 150,20 L 40,100 L 40,50 L -120,50 Z"
            fill="#ff2d78"/>
      <!-- wordmark -->
      <text x="-8" y="30" font-family="Arial Black, Arial, sans-serif" font-weight="900"
            font-size="150" fill="#ffffff" text-anchor="middle"
            stroke="#0a0f1c" stroke-width="8" paint-order="stroke">WLB</text>
    </g>
  </g>
</svg>`;
}

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#0b2f6b"/>
  <path d="M 14,26 L 34,26 L 34,20 L 52,32 L 34,44 L 34,38 L 14,38 Z" fill="#ff2d78"/>
  <circle cx="44" cy="16" r="6" fill="#ffd21e"/>
</svg>`;

async function main() {
  const base = Buffer.from(svg());
  const maskable = Buffer.from(svg({ maskable: true }));

  await sharp(base).resize(192, 192).png().toFile(resolve(OUT, 'pwa-192.png'));
  await sharp(base).resize(512, 512).png().toFile(resolve(OUT, 'pwa-512.png'));
  await sharp(maskable).resize(512, 512).png().toFile(resolve(OUT, 'maskable-512.png'));
  await sharp(base)
    .resize(180, 180)
    .flatten({ background: '#0b2f6b' })
    .png()
    .toFile(resolve(OUT, 'apple-touch-icon-180.png'));
  writeFileSync(resolve(OUT, 'favicon.svg'), faviconSvg);

  console.log('Icons written to', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
