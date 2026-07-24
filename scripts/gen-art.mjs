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
    // July 2026: replaced the FLUX original with the NB2 remake Robbie picked
    // from three candidates (same composition, sharper at 2K). The raw is the
    // NB2 output; regenerating edits it in place via referenceFrom.
    model: 'nb2',
    referenceFrom: ['hero'],
    prompt:
      'Redraw this scene in the same flat screen-print punk poster style at higher ' +
      'fidelity: wide panorama of the Long Beach California waterfront at golden hour, ' +
      'palm trees framing the edges, an outdoor concert stage with a crowd throwing ' +
      'fists up, a skate ramp, the Queen Mary ocean liner silhouette on the horizon, ' +
      'seagulls, giant halftone sun low over the water. Deep navy, hot pink, bright ' +
      'yellow, white. No text, no words, no letters, no watermark.',
    aspect_ratio: '16:9',
    resolution: '2K',
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

  // ---- July 2026 art pass (Nano Banana 2) --------------------------------
  // Style-matched to the FLUX originals via reference images on the /edit
  // endpoint. Every prompt demands an edge-to-edge navy background: the
  // original empty-group baked in a light "postcard" frame that glowed like a
  // theming bug on dark mode.
  'empty-group-v2': {
    model: 'nb2',
    referenceFrom: ['empty-group'],
    prompt:
      'Redraw this illustration in the exact same flat screen-print punk poster style, ' +
      'but with the deep navy blue background filling the entire square edge to edge — ' +
      'no frame, no border, no postcard edges, no pale margins. Keep the three punk ' +
      'friends fist-bump huddle, mohawk beanie and cap silhouettes, yellow burst. ' +
      'No text, no words, no letters, no watermark.',
    aspect_ratio: '1:1',
    resolution: '1K',
    out: [{ file: 'empty-group.webp', width: 480, quality: 80 }],
  },
  'empty-timeline': {
    model: 'nb2',
    referenceFrom: ['empty-schedule', 'empty-map'],
    prompt:
      'In the exact same flat screen-print punk rock poster style as the reference ' +
      'images (deep navy blue background filling the whole square edge to edge, hot ' +
      'pink and bright yellow and white accents, subtle risograph grain, bold thick ' +
      'shapes, clean silhouettes): a wall calendar page pierced by a yellow lightning ' +
      'bolt, with a wristwatch resting beside it, centered spot illustration. ' +
      'No text, no words, no letters, no numbers, no frame, no border.',
    aspect_ratio: '1:1',
    resolution: '1K',
    out: [{ file: 'empty-timeline.webp', width: 480, quality: 80 }],
  },
  'empty-shared': {
    model: 'nb2',
    referenceFrom: ['empty-schedule', 'empty-map'],
    prompt:
      'In the exact same flat screen-print punk rock poster style as the reference ' +
      'images (deep navy blue background filling the whole square edge to edge, hot ' +
      'pink and bright yellow and white accents, subtle risograph grain, bold thick ' +
      'shapes, clean silhouettes): two hands fist-bumping in front of one big shared ' +
      'yellow star with a radiating burst, centered spot illustration. ' +
      'No text, no words, no letters, no frame, no border.',
    aspect_ratio: '1:1',
    resolution: '1K',
    out: [{ file: 'empty-shared.webp', width: 480, quality: 80 }],
  },
  'no-conflicts': {
    model: 'nb2',
    referenceFrom: ['empty-schedule', 'empty-map'],
    prompt:
      'In the exact same flat screen-print punk rock poster style as the reference ' +
      'images (deep navy blue background filling the whole square edge to edge, hot ' +
      'pink and bright yellow and white accents, subtle risograph grain, bold thick ' +
      'shapes, clean silhouettes): a relaxed punk with a mohawk lounging in a beach ' +
      'chair wearing sunglasses, giving a thumbs up, sun burst behind, palm tree, ' +
      'celebratory and easy-going, centered spot illustration. ' +
      'No text, no words, no letters, no frame, no border.',
    aspect_ratio: '1:1',
    resolution: '1K',
    out: [{ file: 'no-conflicts.webp', width: 480, quality: 80 }],
  },
  // (Two unused July 2026 hero candidates — lettered poster and pit view —
  // survive as raws in scripts/.art-raw/hero-nb-{2,3}.png if ever wanted.)
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
