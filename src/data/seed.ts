import type { Repo } from '@/db/repo';
import type { Artist, Performance, MapLocation } from '@/domain/types';
import { artistId, mainPerformanceId, unpluggedPerformanceId } from '@/domain/slug';
import { SATURDAY_ARTISTS } from './artists-saturday';
import { SUNDAY_ARTISTS } from './artists-sunday';
import { UNPLUGGED_APPEARANCES } from './artists-unplugged';
import { STAGES } from './stages';
import { NAMED_LOCATIONS } from './locations';
import { SEED_USERS } from './users';

// Bump when the seed data shape changes. Seeding is idempotent: it adds/updates
// seed records by id but NEVER overwrites user-entered schedule fields.
export const SEED_VERSION = 3;

export interface SeedBundle {
  artists: Artist[];
  performances: Performance[];
  locations: MapLocation[];
}

/**
 * Build the full canonical dataset from the verbatim spec lists. Pure function
 * (no IO) so it can also be used for validation/testing.
 */
export function buildSeed(): SeedBundle {
  const artists = new Map<string, Artist>();
  const performances: Performance[] = [];

  function ensureArtist(name: string, category: Artist['category']): string {
    const id = artistId(name);
    if (!artists.has(id)) {
      artists.set(id, { id, name, searchAliases: [], category });
    }
    return id;
  }

  // Main lineup — Saturday.
  for (const name of SATURDAY_ARTISTS) {
    const aId = ensureArtist(name, 'main-lineup');
    performances.push({
      id: mainPerformanceId('saturday', name),
      artistId: aId,
      type: 'main',
      day: 'saturday',
      stageId: null,
      startTime: null,
      endTime: null,
      estimatedEndTime: null,
      scheduleStatus: 'time-pending',
    });
  }

  // Main lineup — Sunday.
  for (const name of SUNDAY_ARTISTS) {
    const aId = ensureArtist(name, 'main-lineup');
    performances.push({
      id: mainPerformanceId('sunday', name),
      artistId: aId,
      type: 'main',
      day: 'sunday',
      stageId: null,
      startTime: null,
      endTime: null,
      estimatedEndTime: null,
      scheduleStatus: 'time-pending',
    });
  }

  // Warped Unplugged & special appearances. Reuse existing artist record when the
  // name already exists in the main lineup; otherwise create an 'unplugged-special'.
  for (const name of UNPLUGGED_APPEARANCES) {
    const id = artistId(name);
    const category = artists.has(id) ? artists.get(id)!.category : 'unplugged-special';
    const aId = ensureArtist(name, category);
    performances.push({
      id: unpluggedPerformanceId(name),
      artistId: aId,
      type: 'unplugged',
      day: null,
      stageId: 'warped-unplugged-stage',
      startTime: null,
      endTime: null,
      estimatedEndTime: null,
      scheduleStatus: 'time-pending',
    });
  }

  const locations: MapLocation[] = [...STAGES, ...NAMED_LOCATIONS];

  return { artists: [...artists.values()], performances, locations };
}

/**
 * Seed the database idempotently.
 * - Artists: upserted (safe; names/categories are canonical).
 * - Performances: created if missing; if present, only schedule fields are left
 *   untouched (we refresh identity fields but preserve user edits).
 * - Locations: seed pins created if missing; existing pins (possibly calibrated)
 *   are preserved. Custom user pins are never touched.
 * - Users: created if missing; existing users (with avatars/renames) preserved.
 */
export async function seedDatabase(repo: Repo): Promise<void> {
  const bundle = buildSeed();

  // Artists — upsert all.
  const existingArtists = new Map((await repo.allArtists()).map((a) => [a.id, a]));
  const artistsToWrite = bundle.artists.filter((a) => {
    const cur = existingArtists.get(a.id);
    return !cur || cur.name !== a.name || cur.category !== a.category;
  });
  if (artistsToWrite.length) await repo.putArtists(artistsToWrite);

  // Performances — create missing; preserve user-entered schedule on existing.
  const existingPerf = new Map((await repo.allPerformances()).map((p) => [p.id, p]));
  const perfToWrite = bundle.performances.filter((p) => !existingPerf.has(p.id));
  if (perfToWrite.length) await repo.putPerformances(perfToWrite);

  // Locations — create missing seed pins only.
  const existingLoc = new Map((await repo.allLocations()).map((l) => [l.id, l]));
  const locToWrite = bundle.locations.filter((l) => !existingLoc.has(l.id));
  if (locToWrite.length) await repo.putLocations(locToWrite);

  // Users.
  const existingUsers = new Map((await repo.allUsers()).map((u) => [u.id, u]));
  for (const u of SEED_USERS) {
    if (!existingUsers.has(u.id)) await repo.putUser(u);
  }

  await repo.putMeta('seedVersion', SEED_VERSION);
  await repo.putMeta('schemaVersion', 1);
}

/** Expected counts for validation and the Offline Test screen. */
export function seedCounts() {
  const bundle = buildSeed();
  return {
    saturdayMain: SATURDAY_ARTISTS.length,
    sundayMain: SUNDAY_ARTISTS.length,
    unplugged: UNPLUGGED_APPEARANCES.length,
    artists: bundle.artists.length,
    performances: bundle.performances.length,
    stages: STAGES.length,
    locations: bundle.locations.length,
  };
}
