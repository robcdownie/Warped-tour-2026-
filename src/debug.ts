// A small debug/automation surface exposed on window.__WLB__. Used by the
// verification harness (scripts/verify-e2e.mjs) and handy in the console.
// Safe to ship: this is a personal offline app with no secrets.
import { useApp } from '@/store/appStore';
import { detectConflicts } from '@/domain/conflicts';
import { encodeSchedule, encodeSelections } from '@/domain/share/payloads';
import { decodeEnvelope } from '@/domain/share/codec';
import { repoFor } from '@/db/repo';
import type { DayId, Performance, Priority } from '@/domain/types';

export function installDebugHook() {
  const api = {
    state: () => useApp.getState(),
    counts: () => {
      const s = useApp.getState();
      return {
        main: s.performances.filter((p) => p.type === 'main').length,
        unplugged: s.performances.filter((p) => p.type === 'unplugged').length,
        artists: s.artists.length,
        users: s.users.length,
        stages: s.locations.filter((l) => l.category === 'stage').length,
      };
    },
    updatePerformance: (p: Performance) => useApp.getState().updatePerformance(p),
    toggleSelection: (u: string, p: string) => useApp.getState().toggleSelection(u, p),
    setPriority: (u: string, p: string, pr: Priority) => useApp.getState().setPriority(u, p, pr),
    conflicts: (userId: string) => {
      const s = useApp.getState();
      const ctx = {
        userId,
        selections: s.selections,
        performanceById: s.performanceById,
        locationById: s.locationById,
        allPerformances: s.performances,
        crowd: s.settings.crowdDelay,
        turnoverBuffer: s.settings.turnoverBuffer,
        overrides: s.travelOverrides,
      };
      return (['saturday', 'sunday'] as DayId[]).flatMap((d) => detectConflicts(d, ctx));
    },
    exportSchedule: () => {
      const s = useApp.getState();
      return encodeSchedule(s.performances, s.settings.activeUserId, new Date().toISOString());
    },
    exportSelections: (userId: string) => {
      const s = useApp.getState();
      const user = s.userById.get(userId)!;
      return encodeSelections(user, s.selections, new Date().toISOString());
    },
    decode: (code: string) => decodeEnvelope(code),
    applyImport: (env: ReturnType<typeof decodeEnvelope>) => useApp.getState().applyImport(env),
    resetSchedule: async () => {
      const s = useApp.getState();
      const repo = repoFor(s.mode);
      for (const p of s.performances) {
        if (p.startTime || p.endTime || (p.type === 'main' && p.stageId)) {
          await repo.putPerformance({
            ...p,
            stageId: p.type === 'unplugged' ? p.stageId : null,
            startTime: null,
            endTime: null,
            estimatedEndTime: null,
            scheduleStatus: 'time-pending',
          });
        }
      }
      await useApp.getState().reloadAll();
    },
  };
  (window as unknown as { __WLB__: typeof api }).__WLB__ = api;
}
