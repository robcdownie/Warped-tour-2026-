import { repoFor } from '@/db/repo';
import { seedCounts } from '@/data/seed';
import { MAP_IMAGE_URL, BASE_URL } from '@/config/event';

export interface TestResult {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  /** Essential tests gate the "Ready for offline use" confirmation. */
  essential: boolean;
}

async function anyCacheMatch(predicate: (url: string) => boolean): Promise<boolean> {
  if (!('caches' in window)) return false;
  const names = await caches.keys();
  for (const name of names) {
    const cache = await caches.open(name);
    const reqs = await cache.keys();
    if (reqs.some((r) => predicate(r.url))) return true;
  }
  return false;
}

/** Run every offline-readiness check. Order roughly matches spec §3. */
export async function runOfflineTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const counts = seedCounts();

  // 1. Service worker active + controlling.
  {
    let pass = false;
    let detail = 'Service workers unsupported in this browser.';
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const active = !!reg?.active;
      const controlling = !!navigator.serviceWorker.controller;
      pass = active;
      detail = active
        ? controlling
          ? 'Active and controlling this page.'
          : 'Active. Will control the page after one reload.'
        : 'Not registered yet — open online once, then reload.';
    }
    results.push({ id: 'sw', label: 'Service worker active', pass, detail, essential: true });
  }

  // 2. App shell precached (index.html or the built JS/CSS present in a cache).
  {
    const hasShell = await anyCacheMatch(
      (url) =>
        url.endsWith('/') ||
        url.includes('index.html') ||
        /\/assets\/.*\.(js|css)$/.test(url),
    );
    results.push({
      id: 'shell',
      label: 'App shell cached',
      pass: hasShell,
      detail: hasShell
        ? 'HTML/JS/CSS found in Cache Storage.'
        : 'App shell not in cache yet — reload once while online.',
      essential: true,
    });
  }

  // 3. Festival map cached.
  {
    const hasMap = await anyCacheMatch((url) => url.includes('festival-map'));
    results.push({
      id: 'map',
      label: 'Festival map cached',
      pass: hasMap,
      detail: hasMap ? 'Map image is available offline.' : `Map (${MAP_IMAGE_URL}) not cached yet.`,
      essential: true,
    });
  }

  // 4. Artist database available (counts match seed).
  {
    const repo = repoFor('prod');
    const artists = await repo.allArtists();
    const perfs = await repo.allPerformances();
    const mainCount = perfs.filter((p) => p.type === 'main').length;
    const expectedMain = counts.saturdayMain + counts.sundayMain;
    const pass = artists.length >= counts.artists && mainCount === expectedMain;
    results.push({
      id: 'artists',
      label: 'Artist database ready',
      pass,
      detail: `${artists.length} artists, ${mainCount}/${expectedMain} main performances.`,
      essential: true,
    });
  }

  // 5. Stage database available.
  {
    const repo = repoFor('prod');
    const locs = await repo.allLocations();
    const stages = locs.filter((l) => l.category === 'stage');
    const pass = stages.length >= counts.stages;
    results.push({
      id: 'stages',
      label: 'Stage database ready',
      pass,
      detail: `${stages.length}/${counts.stages} stages, ${locs.length} total map locations.`,
      essential: true,
    });
  }

  // 6. User data write/read roundtrip.
  {
    const repo = repoFor('prod');
    let pass = false;
    let detail = '';
    try {
      const token = `selftest-${Date.now()}`;
      await repo.putMeta('__selftest', token);
      const readBack = await repo.getMeta<string>('__selftest');
      pass = readBack === token;
      detail = pass ? 'IndexedDB write/read confirmed.' : 'Read-back did not match.';
    } catch (e) {
      detail = `IndexedDB error: ${(e as Error).message}`;
    }
    results.push({ id: 'idb', label: 'Local data saves', pass, detail, essential: true });
  }

  // 7. Persistent storage (best-effort — not essential, iOS often denies).
  {
    let persisted = false;
    if (navigator.storage?.persisted) {
      persisted = await navigator.storage.persisted();
    }
    results.push({
      id: 'persist',
      label: 'Persistent storage granted',
      pass: persisted,
      detail: persisted
        ? 'The OS will avoid evicting your data.'
        : 'Not granted (common on iOS). Keep a backup export as insurance.',
      essential: false,
    });
  }

  // 8. Base scope reachable from cache (implies reopen-offline works).
  {
    const hasBase = await anyCacheMatch((url) => {
      try {
        const u = new URL(url);
        return u.pathname === BASE_URL || u.pathname === `${BASE_URL}index.html`;
      } catch {
        return false;
      }
    });
    results.push({
      id: 'reopen',
      label: 'Can reopen offline',
      pass: hasBase,
      detail: hasBase
        ? 'Start URL is cached — the app opens with no signal.'
        : 'Start URL not cached yet — reload once while online.',
      essential: true,
    });
  }

  return results;
}

export function allEssentialPass(results: TestResult[]): boolean {
  const essential = results.filter((r) => r.essential);
  return essential.length > 0 && essential.every((r) => r.pass);
}
