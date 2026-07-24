import { create } from 'zustand';
import type { AppMode } from '@/db/db';
import { repoFor } from '@/db/repo';
import { requestPersistentStorage, deleteDemoDb } from '@/db/db';
import { seedDatabase, SEED_VERSION } from '@/data/seed';
import { seedDemoSchedule, seedDemoSelections } from '@/data/demoSchedule';
import { DEFAULT_SETTINGS } from '@/domain/settings';
import { SEED_USERS } from '@/data/users';
import type {
  Artist,
  Performance,
  User,
  Selection,
  MapLocation,
  CheckIn,
  TravelOverride,
  AppSettings,
  Priority,
  AttendanceDecision,
} from '@/domain/types';
import { selectionKey } from '@/db/schema';
import { commitImport, rollbackImport } from '@/domain/share/importCommit';

export type TabId = 'now' | 'bands' | 'schedule' | 'group' | 'map';

interface AppState {
  // lifecycle
  hydrated: boolean;
  mode: AppMode; // 'prod' | 'demo'
  activeTab: TabId;
  online: boolean;

  // data (mirrors IndexedDB)
  artists: Artist[];
  performances: Performance[];
  users: User[];
  selections: Selection[];
  locations: MapLocation[];
  checkins: CheckIn[];
  travelOverrides: TravelOverride[];
  settings: AppSettings;

  // derived lookups (rebuilt on data change)
  artistById: Map<string, Artist>;
  performanceById: Map<string, Performance>;
  locationById: Map<string, MapLocation>;
  userById: Map<string, User>;

  // actions
  hydrate: () => Promise<void>;
  setMode: (mode: AppMode) => Promise<void>;
  setTab: (tab: TabId) => void;
  setOnline: (online: boolean) => void;

  reloadAll: () => Promise<void>;

  // settings
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;

  // selections
  getSelection: (userId: string, performanceId: string) => Selection | undefined;
  toggleSelection: (userId: string, performanceId: string) => Promise<void>;
  setPriority: (userId: string, performanceId: string, priority: Priority) => Promise<void>;
  setAttendance: (
    userId: string,
    performanceId: string,
    decision: AttendanceDecision,
    skippedForConflict?: boolean,
  ) => Promise<void>;
  setNotes: (userId: string, performanceId: string, notes: string) => Promise<void>;
  putSelectionsBulk: (list: Selection[]) => Promise<void>;

  // performances (schedule editing)
  updatePerformance: (perf: Performance, historySummary?: string) => Promise<void>;
  undoLastScheduleEdit: () => Promise<boolean>;

  // locations
  putLocation: (loc: MapLocation) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;

  // checkins
  putCheckIn: (c: CheckIn) => Promise<void>;
  deleteCheckIn: (id: string) => Promise<void>;

  // travel overrides
  putTravelOverride: (o: TravelOverride) => Promise<void>;
  clearTravelOverrides: () => Promise<void>;

  // users
  putUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // sharing
  applyImport: (env: import('@/domain/share/codec').Envelope) => Promise<{ backupId: number; summary: string }>;
  rollbackImport: (backupId: number) => Promise<boolean>;

  // resets / recovery
  resetSchedule: () => Promise<void>;
  resetMap: () => Promise<void>;
  resetAllLocalData: () => Promise<void>;
  resetDemoData: () => Promise<void>;

  // demo mode
  enterDemo: () => Promise<void>;
  exitDemo: () => Promise<void>;
}

function buildLookups(state: {
  artists: Artist[];
  performances: Performance[];
  locations: MapLocation[];
  users: User[];
}) {
  return {
    artistById: new Map(state.artists.map((a) => [a.id, a])),
    performanceById: new Map(state.performances.map((p) => [p.id, p])),
    locationById: new Map(state.locations.map((l) => [l.id, l])),
    userById: new Map(state.users.map((u) => [u.id, u])),
  };
}

export const useApp = create<AppState>((set, get) => ({
  hydrated: false,
  mode: 'prod',
  activeTab: 'now',
  online: navigator.onLine,

  artists: [],
  performances: [],
  users: [],
  selections: [],
  locations: [],
  checkins: [],
  travelOverrides: [],
  settings: { ...DEFAULT_SETTINGS },

  artistById: new Map(),
  performanceById: new Map(),
  locationById: new Map(),
  userById: new Map(),

  hydrate: async () => {
    const repo = repoFor('prod');
    // Seed if needed (idempotent).
    const seedVersion = await repo.getMeta<number>('seedVersion');
    if (seedVersion !== SEED_VERSION) {
      await seedDatabase(repo);
    }
    void requestPersistentStorage();
    await get().reloadAll();
    set({ hydrated: true });
  },

  setMode: async (mode) => {
    if (mode === get().mode) return;
    if (mode === 'demo') {
      const repo = repoFor('demo');
      const seedVersion = await repo.getMeta<number>('seedVersion');
      if (seedVersion !== SEED_VERSION) await seedDatabase(repo);
    }
    set({ mode });
    await get().reloadAll();
  },

  setTab: (tab) => set({ activeTab: tab }),
  setOnline: (online) => set({ online }),

  reloadAll: async () => {
    const repo = repoFor(get().mode);
    const [
      artists,
      performances,
      users,
      selections,
      locations,
      checkins,
      travelOverrides,
      settings,
    ] = await Promise.all([
      repo.allArtists(),
      repo.allPerformances(),
      repo.allUsers(),
      repo.allSelections(),
      repo.allLocations(),
      repo.allCheckins(),
      repo.allTravelOverrides(),
      repo.getSettings(),
    ]);
    artists.sort((a, b) => a.name.localeCompare(b.name));
    // Preserve the seed order (Robbie, Ari, Morgan); append any later-added users.
    const seedOrder = SEED_USERS.map((u) => u.id);
    users.sort((a, b) => {
      const ia = seedOrder.indexOf(a.id);
      const ib = seedOrder.indexOf(b.id);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    set({
      artists,
      performances,
      users,
      selections,
      locations,
      checkins,
      travelOverrides,
      settings,
      ...buildLookups({ artists, performances, locations, users }),
    });
  },

  updateSettings: async (patch) => {
    const repo = repoFor(get().mode);
    const next = { ...get().settings, ...patch };
    await repo.putSettings(next);
    set({ settings: next });
  },

  getSelection: (userId, performanceId) =>
    get().selections.find(
      (s) => s.userId === userId && s.performanceId === performanceId,
    ),

  toggleSelection: async (userId, performanceId) => {
    const repo = repoFor(get().mode);
    // Read fresh from IndexedDB (not the in-memory mirror) so two mutations
    // fired before a reloadAll resolves can't clobber each other's fields.
    const existing = await repo.getSelection(userId, performanceId);
    if (existing) {
      const next = { ...existing, selected: !existing.selected };
      await repo.putSelection(next);
    } else {
      const next: Selection = {
        userId,
        performanceId,
        priority: 'want-to-see',
        selected: true,
        attendanceDecision: 'undecided',
        notes: '',
      };
      await repo.putSelection(next);
    }
    await get().reloadAll();
  },

  setPriority: async (userId, performanceId, priority) => {
    const repo = repoFor(get().mode);
    const existing = (await repo.getSelection(userId, performanceId)) ?? {
      userId,
      performanceId,
      selected: true,
      attendanceDecision: 'undecided' as AttendanceDecision,
      notes: '',
      priority: 'want-to-see' as Priority,
    };
    await repo.putSelection({ ...existing, priority, selected: true });
    await get().reloadAll();
  },

  setAttendance: async (userId, performanceId, decision, skippedForConflict) => {
    const repo = repoFor(get().mode);
    const existing = await repo.getSelection(userId, performanceId);
    if (!existing) return;
    await repo.putSelection({
      ...existing,
      attendanceDecision: decision,
      skippedForConflict: skippedForConflict ?? existing.skippedForConflict,
    });
    await get().reloadAll();
  },

  setNotes: async (userId, performanceId, notes) => {
    const repo = repoFor(get().mode);
    const existing = (await repo.getSelection(userId, performanceId)) ?? {
      userId,
      performanceId,
      selected: true,
      attendanceDecision: 'undecided' as AttendanceDecision,
      priority: 'want-to-see' as Priority,
      notes: '',
    };
    await repo.putSelection({ ...existing, notes });
    await get().reloadAll();
  },

  putSelectionsBulk: async (list) => {
    const repo = repoFor(get().mode);
    await repo.putSelections(list);
    await get().reloadAll();
  },

  updatePerformance: async (perf, historySummary) => {
    const repo = repoFor(get().mode);
    const before = get().performanceById.get(perf.id);
    if (before && historySummary) {
      await repo.addHistory({
        ts: new Date().toISOString(),
        kind: 'schedule-edit',
        summary: historySummary,
        undo: {
          performanceId: perf.id,
          before: {
            stageId: before.stageId,
            startTime: before.startTime,
            endTime: before.endTime,
            estimatedEndTime: before.estimatedEndTime,
            scheduleStatus: before.scheduleStatus,
            day: before.day,
          },
        },
      });
    }
    await repo.putPerformance(perf);
    await get().reloadAll();
  },

  undoLastScheduleEdit: async () => {
    const repo = repoFor(get().mode);
    // Peek first — only delete the entry once the undo actually applies, so a
    // failed undo can't silently consume history.
    const top = await repo.peekUndoableHistory();
    if (!top) return false;
    const cur = await repo.getPerformance(top.entry.undo!.performanceId);
    if (!cur) {
      // The performance no longer exists; the entry can never apply. Drop it
      // so it doesn't wedge the undo stack.
      await repo.deleteHistory(top.key);
      return false;
    }
    await repo.putPerformance({ ...cur, ...top.entry.undo!.before });
    await repo.deleteHistory(top.key);
    await get().reloadAll();
    return true;
  },

  putLocation: async (loc) => {
    const repo = repoFor(get().mode);
    await repo.putLocation(loc);
    await get().reloadAll();
  },

  deleteLocation: async (id) => {
    const repo = repoFor(get().mode);
    await repo.deleteLocation(id);
    await get().reloadAll();
  },

  putCheckIn: async (c) => {
    const repo = repoFor(get().mode);
    await repo.putCheckIn(c);
    await get().reloadAll();
  },

  deleteCheckIn: async (id) => {
    const repo = repoFor(get().mode);
    await repo.deleteCheckIn(id);
    await get().reloadAll();
  },

  putTravelOverride: async (o) => {
    const repo = repoFor(get().mode);
    await repo.putTravelOverride(o);
    await get().reloadAll();
  },

  clearTravelOverrides: async () => {
    const repo = repoFor(get().mode);
    await repo.clearTravelOverrides();
    await get().reloadAll();
  },

  putUser: async (u) => {
    const repo = repoFor(get().mode);
    await repo.putUser(u);
    await get().reloadAll();
  },

  deleteUser: async (id) => {
    const repo = repoFor(get().mode);
    await repo.deleteUser(id);
    await repo.deleteSelectionsForUser(id);
    await get().reloadAll();
  },

  applyImport: async (env) => {
    const repo = repoFor(get().mode);
    const res = await commitImport(repo, env);
    await get().reloadAll();
    return res;
  },

  rollbackImport: async (backupId) => {
    const repo = repoFor(get().mode);
    const ok = await rollbackImport(repo, backupId);
    await get().reloadAll();
    return ok;
  },

  resetSchedule: async () => {
    const repo = repoFor(get().mode);
    const cleared = get().performances.map((p) => ({
      ...p,
      // keep Unplugged stage assignment (it's fixed); clear everything else
      stageId: p.type === 'unplugged' ? p.stageId : null,
      startTime: null,
      endTime: null,
      estimatedEndTime: null,
      scheduleStatus: 'time-pending' as const,
    }));
    await repo.putPerformances(cleared);
    await repo.clearStore('history');
    await get().reloadAll();
  },

  resetMap: async () => {
    const repo = repoFor(get().mode);
    await repo.clearStore('locations');
    await repo.clearTravelOverrides();
    await seedDatabase(repo); // re-seeds seed locations at seed coordinates
    await get().reloadAll();
  },

  resetAllLocalData: async () => {
    const repo = repoFor(get().mode);
    await repo.clearAll();
    await seedDatabase(repo);
    await get().reloadAll();
  },

  resetDemoData: async () => {
    await deleteDemoDb();
    const repo = repoFor('demo');
    await seedDatabase(repo);
    await seedDemoSchedule(repo);
    await seedDemoSelections(repo);
    if (get().mode === 'demo') await get().reloadAll();
  },

  enterDemo: async () => {
    const repo = repoFor('demo');
    const seeded = await repo.getMeta<number>('seedVersion');
    if (seeded !== SEED_VERSION) await seedDatabase(repo);
    // Populate fictional times/selections if not already present.
    const perfs = await repo.allPerformances();
    if (!perfs.some((p) => p.startTime)) {
      await seedDemoSchedule(repo);
      await seedDemoSelections(repo);
    }
    set({ mode: 'demo' });
    await get().reloadAll();
  },

  exitDemo: async () => {
    set({ mode: 'prod' });
    await get().reloadAll();
  },
}));

/** Convenience selector: the active user record. */
export function useActiveUser(): User | undefined {
  return useApp((s) => s.userById.get(s.settings.activeUserId));
}

export { selectionKey };
