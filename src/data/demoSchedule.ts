import type { Repo } from '@/db/repo';
import type { Performance, Selection, DayId } from '@/domain/types';
import { STAGES } from './stages';
import { minutesToHHMM } from '@/domain/time';

// Fictional demo schedule (spec §34). Assigns plausible-looking set times so the
// interface can be exercised. DEMO ONLY — never shown in production.

const MUSIC_STAGES = STAGES.filter((s) => s.id !== 'warped-unplugged-stage');
const SLOT_MINUTES = 50; // 45-min sets + 5-min gap
const DAY_START = 12 * 60; // 12:00
const DAY_END = 21 * 60 + 30; // 21:30

/** Populate a fictional schedule in the given (demo) repo. */
export async function seedDemoSchedule(repo: Repo): Promise<void> {
  const all = await repo.allPerformances();
  const updates: Performance[] = [];

  for (const day of ['saturday', 'sunday'] as DayId[]) {
    const dayPerfs = all.filter((p) => p.type === 'main' && p.day === day);
    // Round-robin artists onto stages, staggering start times per stage.
    const stageCursors = new Map<string, number>(MUSIC_STAGES.map((s, i) => [s.id, DAY_START + (i % 3) * 15]));
    dayPerfs.forEach((p, idx) => {
      const stage = MUSIC_STAGES[idx % MUSIC_STAGES.length];
      let start = stageCursors.get(stage.id)!;
      if (start > DAY_END) start = DAY_START + (idx % 5) * 20; // wrap for busy days
      const end = start + 45;
      updates.push({
        ...p,
        stageId: stage.id,
        startTime: minutesToHHMM(start),
        endTime: minutesToHHMM(end),
        estimatedEndTime: null,
        scheduleStatus: 'scheduled',
      });
      stageCursors.set(stage.id, start + SLOT_MINUTES);
    });
  }

  await repo.putPerformances(updates);
}

/** Seed sample selections for the three friends so demo screens have data. */
export async function seedDemoSelections(repo: Repo): Promise<void> {
  const all = await repo.allPerformances();
  const sat = all.filter((p) => p.type === 'main' && p.day === 'saturday' && p.startTime);
  const picks: Selection[] = [];
  const pick = (userId: string, perf: Performance | undefined, priority: Selection['priority'], decision: Selection['attendanceDecision'] = 'attending') => {
    if (!perf) return;
    picks.push({ userId, performanceId: perf.id, priority, selected: true, attendanceDecision: decision, notes: '' });
  };
  // Give each friend a handful across the day.
  pick('robbie', sat[0], 'must-see');
  pick('robbie', sat[3], 'want-to-see');
  pick('robbie', sat[7], 'must-see');
  pick('ari', sat[0], 'must-see');
  pick('ari', sat[4], 'want-to-see', 'undecided');
  pick('ari', sat[8], 'must-see');
  pick('morgan', sat[2], 'want-to-see');
  pick('morgan', sat[7], 'must-see');
  pick('morgan', sat[10], 'want-to-see', 'undecided');
  await repo.putSelections(picks);

  // Stamp friend-import metadata so the crew shows as imported in demo.
  const settings = await repo.getSettings();
  settings.friendImports = {
    ari: { userId: 'ari', importedAt: new Date().toISOString(), selectionCount: 3 },
    morgan: { userId: 'morgan', importedAt: new Date().toISOString(), selectionCount: 3 },
  };
  await repo.putSettings(settings);
}
