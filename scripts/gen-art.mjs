// Generates the app's custom artwork via fal.ai and post-processes it with
// sharp into optimized, offline-bundled assets.
//
// Two models:
//   - FLUX dev (default, ~$0.03/img): the original pipeline. Can't render
//     text (mangled lettering) — keep "no text" in every FLUX prompt.
//   - Nano Banana 2 (model: 'nb2', $0.08 @1K / $0.12 @2K / $0.16 @4K):
//     accurate typography and reference-image editing (referenceFrom: keys of
//     other assets whose raw PNGs style-anchor the edit endpoint).
//
// Requires FAL_KEY in .env (gitignored — never shipped to the client; only this
// local script talks to fal.ai, and only the finished images are committed).
//
// Usage:
//   node scripts/gen-art.mjs           # generate everything missing
//   node scripts/gen-art.mjs --force   # regenerate everything
//   node scripts/gen-art.mjs hero      # regenerate one asset by key
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const RAW = resolve(root, 'scripts/.art-raw'); // gitignored working copies
const OUT = resolve(root, 'public/art');
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

// ---- key ------------------------------------------------------------------
function falKey() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) throw new Error('.env with FAL_KEY not found');
  const m = readFileSync(envPath, 'utf8').match(/^FAL_KEY=(.+)$/m);
  if (!m) throw new Error('FAL_KEY missing from .env');
  return m[1].trim();
}

// ---- shared style ---------------------------------------------------------
// One consistent visual language: flat screen-print punk poster in the app's
// palette. "no text" everywhere — AI lettering comes out mangled.
const STYLE =
  'flat screen-print punk rock poster illustration, bold thick shapes, ' +
  'deep navy blue background, hot pink and bright yellow and white accents, ' +
  'subtle risograph grain, clean silhouettes, high contrast, ' +
  'no text, no words, no letters, no watermark';

const ASSETS = {
  hero: {
    prompt:
      `${STYLE}, wide panorama of the Long Beach California waterfront at golden hour: ` +
      'palm trees, an outdoor concert stage with a crowd throwing fists up, a skate ramp, ' +
      'the Queen Mary ship silhouette on the horizon, seagulls, halftone sun',
    image_size: { width: 1440, height: 768 },
    out: [{ file: 'hero.webp', width: 1080, quality: 80 }],
  },
  icon: {
    // Raw only — consumed by gen-icons.mjs (never shipped at full size).
    prompt:
      `${STYLE}, bold sticker-style emblem, centered composition: an electric guitar ` +
      'crossed with a palm tree over a breaking ocean wave, radiating yellow sunburst behind, ' +
      'thick white outline around the emblem, symmetrical, iconic, simple enough to read at tiny sizes',
    image_size: 'square_hd',
    out: [],
  },
  'empty-group': {
    prompt:
      `${STYLE}, three punk friends doing a fist-bump huddle seen from the front, ` +
      'mohawk, beanie and cap silhouettes, yellow burst behind them, centered spot illustration',
    image_size: 'square_hd',
    out: [{ file: 'empty-group.webp', width: 480, quality: 80 }],
  },
  'empty-schedule': {
    prompt:
      `${STYLE}, a gig flyer stapled to a telephone pole flapping in the wind, ` +
      'blank flyer with a lightning bolt, safety pins in the corners, centered spot illustration',
    image_size: 'square_hd',
    out: [{ file: 'empty-schedule.webp', width: 480, quality: 80 }],
  },
  'empty-map': {
    prompt:
      `${STYLE}, a folded treasure-style festival map with a big location pin marker ` +
      'stabbed into it like a dagger, dotted path across the map, compass rose, centered spot illustration',
    image_size: 'square_hd',
    out: [{ file: 'empty-map.webp', width: 480, quality: 80 }],
  },
  splash: {
    // iOS home-screen launch image (apple-touch-startup-image). Portrait
    // composition — the landscape hero doesn't crop to 9:19.5 without losing
    // the scene. Rendered at 4 device sizes below.
    prompt:
      `${STYLE}, tall vertical concert poster composition of the Long Beach California ` +
      'waterfront at golden hour: a giant halftone sun low over the ocean in the center, ' +
      'the Queen Mary ship silhouette on the horizon, tall palm trees framing the left and ' +
      'right edges, a concert crowd with raised fists silhouetted along the bottom, ' +
      'seagulls in the open sky above, dramatic vertical depth',
    image_size: { width: 864, height: 1536 },
    out: [
      { file: 'splash/splash-1170x2532.png', cover: [1170, 2532], png: true },
      { file: 'splash/splash-1179x2556.png', cover: [1179, 2556], png: true },
      { file: 'splash/splash-1290x2796.png', cover: [1290, 2796], png: true },
      { file: 'splash/splash-750x1334.png', cover: [750, 1334], png: true },
    ],
  },
  'empty-bands': {
    // Derived from the icon emblem rather than generated: every attempt at an
    // "amp + guitar" scene came back with a real Marshall logo (FLUX has it
    // memorized), and the brand-free emblem reads perfectly as band art.
    deriveFrom: 'icon',
    out: [{ file: 'empty-bands.webp', width: 480, quality: 80 }],
  },
};

// ---- fal.ai ---------------------------------------------------------------
// Spend tracking — printed at the end of every run so the budget stays visible.
const NB2_RATE = { '0.5K': 0.06, '1K': 0.08, '2K': 0.12, '4K': 0.16 };
const FLUX_RATE = 0.03; // ~$0.025/MP, our sizes are ~1MP
let spend = 0;

async function falPost(endpoint, body) {
  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`fal.ai ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

function rawAsDataUri(key) {
  const p = resolve(RAW, `${key}.png`);
  if (!existsSync(p)) throw new Error(`referenceFrom "${key}" has no raw PNG — generate it first`);
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
}

async function generate(key, spec) {
  console.log(`[fal] generating "${key}" (${spec.model === 'nb2' ? 'nano-banana-2' : 'flux/dev'}) …`);
  let json;
  if (spec.model === 'nb2') {
    const body = {
      prompt: spec.prompt,
      aspect_ratio: spec.aspect_ratio ?? '1:1',
      resolution: spec.resolution ?? '1K',
      num_images: 1,
      output_format: 'png',
    };
    // Reference images route through the edit endpoint for style consistency.
    const refs = (spec.referenceFrom ?? []).map(rawAsDataUri);
    if (refs.length) {
      json = await falPost('fal-ai/nano-banana-2/edit', { ...body, image_urls: refs });
    } else {
      json = await falPost('fal-ai/nano-banana-2', body);
    }
    spend += NB2_RATE[body.resolution] ?? NB2_RATE['1K'];
  } else {
    json = await falPost('fal-ai/flux/dev', {
      prompt: spec.prompt,
      image_size: spec.image_size,
      num_images: 1,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      enable_safety_checker: true,
      output_format: 'png',
    });
    spend += FLUX_RATE;
  }
  const url = json?.images?.[0]?.url;
  if (!url) throw new Error(`fal.ai returned no image for ${key}`);
  const img = await fetch(url);
  const buf = Buffer.from(await img.arrayBuffer());
  const rawPath = resolve(RAW, `${key}.png`);
  writeFileSync(rawPath, buf);
  console.log(`[fal] saved raw ${rawPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  return rawPath;
}

async function postProcess(key, spec, rawPath) {
  for (const o of spec.out) {
    const dest = resolve(OUT, o.file);
    mkdirSync(dirname(dest), { recursive: true });
    let img = o.cover
      ? sharp(rawPath).resize(o.cover[0], o.cover[1], { fit: 'cover' })
      : sharp(rawPath).resize(o.width, null, { withoutEnlargement: true });
    img = o.png
      ? img.png({ palette: true, quality: 80, compressionLevel: 9 })
      : img.webp({ quality: o.quality ?? 80 });
    await img.toFile(dest);
    const kb = (await import('node:fs')).statSync(dest).size / 1024;
    console.log(`[art] wrote ${dest} (${kb.toFixed(0)} KB)`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const only = args.filter((a) => !a.startsWith('--'));
  const keys = only.length ? only : Object.keys(ASSETS);

  for (const key of keys) {
    const spec = ASSETS[key];
    if (!spec) throw new Error(`Unknown asset "${key}". Known: ${Object.keys(ASSETS).join(', ')}`);
    const rawPath = resolve(RAW, `${key}.png`);
    const finalExists = spec.out.every((o) => existsSync(resolve(OUT, o.file)));
    if (finalExists && !force && !only.length) {
      console.log(`[skip] ${key} already generated`);
      continue;
    }
    let raw;
    if (spec.deriveFrom) {
      raw = resolve(RAW, `${spec.deriveFrom}.png`);
      if (!existsSync(raw)) throw new Error(`${key} derives from "${spec.deriveFrom}" — generate it first`);
    } else {
      raw = existsSync(rawPath) && !force && only.length === 0 ? rawPath : await generate(key, spec);
    }
    await postProcess(key, spec, raw);
  }
  console.log(spend > 0 ? `Done. Estimated fal.ai spend this run: $${spend.toFixed(2)}` : 'Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
