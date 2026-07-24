# Warped Long Beach Companion

An **unofficial personal companion app** for Vans Warped Tour Long Beach 2026 (Sat Jul 25 – Sun Jul 26), built for Robbie, Ari & Morgan. It's a **local-first, installable Progressive Web App** that works fully offline once installed — designed for weak festival cell service.

> Unofficial personal companion app. Not affiliated with or endorsed by Vans or Vans Warped Tour.

## What it does

- Select bands before the festival (all 151 main-lineup artists + Warped Unplugged appearances).
- Import each friend's selections by QR code or short text code (no server, no login).
- Enter official stages & set times fast when they're announced.
- Detect overlapping sets and tight travel windows.
- Show where each friend *plans* to be through the day on the real festival map.
- Suggest good meetup times and places.
- Keep working with no signal: force-close, airplane mode, reopen — your data stays.

## Tech

Vite · React · TypeScript · Tailwind CSS v4 · IndexedDB (via `idb`) · Service Worker (`vite-plugin-pwa` / Workbox). No backend, no accounts, no remote fonts or images.

## Run locally

```bash
npm install
npm run dev            # http://localhost:5173/Warped-tour-2026-/
```

Production build + local preview (service worker only runs in a build):

```bash
npm run build
npm run preview
```

Regenerate the map crop and app icons from source art:

```bash
npm run assets         # crop the festival map + generate icons (needs sharp)
```

## Deploy (GitHub Pages)

Deployment is automatic. Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. Live URL:

```
https://robcdownie.github.io/Warped-tour-2026-/
```

One-time setup: in the repo's **Settings → Pages**, set **Source = GitHub Actions** (done once).

## Install on iPhone

1. Open the live URL in **Safari** (not in-app browsers).
2. Wait for the header to show **"Ready for offline use"** (or open **Menu → Offline Test** and confirm all essential checks are green).
3. Tap the **Share** button → **Add to Home Screen** → **Add**.
4. Open the app from the Home Screen icon once more while you still have signal, so the service worker finishes caching.
5. You're set — it now works in Airplane Mode.

## Verify offline

Open **Menu → Offline Test**. It checks: service worker active, app shell cached, festival map cached, artist database, stage database, local-data read/write, and reopen-offline. The **"Ready for offline use"** badge only appears when every essential check passes.

To prove it: turn on Airplane Mode, force-close the app, reopen from the Home Screen, and navigate every tab.

## Project layout

```
scripts/         # asset pipeline (map crop, icons) + screenshot harness
public/          # festival map (webp) + app icons (committed, used by the build)
docs/            # guides + original map screenshot (for re-cropping)
src/
  config/        # event configuration
  data/          # seed data: artists, stages, locations, users
  db/            # IndexedDB schema, migrations, repository
  domain/        # pure logic: time, conflicts, meetups, positions, sharing
  store/         # Zustand app store + selectors
  screens/       # Now, Bands, Schedule, Group, Map + menu screens
  components/    # shared UI
```

More detailed guides live in [`docs/`](docs/) (added through the build): installation, offline testing, data import/export, replacing the map, correcting artist data, entering the set-time schedule, and adding future users.

## Known limitations

- **Two offline phones cannot sync on their own.** Sharing selections or check-ins between phones needs a QR scan or a pasted code — this is a real constraint of offline devices, and the app says so plainly rather than faking live sync.
- Travel times are **approximate** walking estimates, not GPS routing.
- Live GPS location sharing is intentionally out of scope (optional future enhancement).
