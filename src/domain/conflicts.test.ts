import { describe, it, expect } from 'vitest';
import { detectConflicts, type ConflictContext } from './conflicts';
import type { Performance, Selection, MapLocation, Priority } from './types';

// Two stages far apart so travel is meaningful.
const stages: MapLocation[] = [
  { id: 'ghost', name: 'Ghost Stage', shortName: 'Ghost', category: 'stage', xPercent: 93, yPercent: 45 },
  { id: 'rex', name: 'Rex Stage', shortName: 'Rex', category: 'stage', xPercent: 26, yPercent: 70 },
  { id: 'beatbox', name: 'BeatBox Stage', shortName: 'BeatBox', category: 'stage', xPercent: 84, yPercent: 45 },
];

function perf(id: string, stageId: string, start: string, end: string | null = null): Performance {
  return {
    id,
    artistId: id,
    type: 'main',
    day: 'saturday',
    stageId,
    startTime: start,
    endTime: end,
    estimatedEndTime: null,
    scheduleStatus: 'scheduled',
  };
}

function sel(performanceId: string, priority: Priority = 'want-to-see'): Selection {
  return { userId: 'robbie', performanceId, priority, selected: true, attendanceDecision: 'undecided', notes: '' };
}

function ctx(perfs: Performance[], sels: Selection[]): ConflictContext {
  return {
    userId: 'robbie',
    selections: sels,
    performanceById: new Map(perfs.map((p) => [p.id, p])),
    locationById: new Map(stages.map((s) => [s.id, s])),
    allPerformances: perfs,
    crowd: 'normal',
    turnoverBuffer: 10,
    overrides: [],
  };
}

describe('conflict engine (spec §22, §28)', () => {
  it('detects a direct time overlap (acceptance §24)', () => {
    const perfs = [perf('a', 'ghost', '15:00', '15:40'), perf('b', 'rex', '15:20', '16:00')];
    const conflicts = detectConflicts('saturday', ctx(perfs, [sel('a'), sel('b')]));
    expect(conflicts.some((c) => c.type === 'overlap' || c.type === 'must-see-conflict')).toBe(true);
  });

  it('flags must-see vs must-see as high severity', () => {
    const perfs = [perf('a', 'ghost', '15:00', '15:40'), perf('b', 'rex', '15:20', '16:00')];
    const conflicts = detectConflicts('saturday', ctx(perfs, [sel('a', 'must-see'), sel('b', 'must-see')]));
    const c = conflicts.find((x) => x.type === 'must-see-conflict');
    expect(c).toBeDefined();
    expect(c!.severity).toBe('high');
  });

  it('detects insufficient travel time between consecutive sets (acceptance §25)', () => {
    // Ghost ends 15:40, Rex starts 15:45 → 5 min gap, but Ghost→Rex walk is ~8 min.
    const perfs = [perf('a', 'ghost', '15:00', '15:40'), perf('b', 'rex', '15:45', '16:20')];
    const conflicts = detectConflicts('saturday', ctx(perfs, [sel('a'), sel('b')]));
    expect(conflicts.some((c) => c.type === 'insufficient-travel')).toBe(true);
  });

  it('allows a comfortable gap between nearby stages', () => {
    // Ghost ends 15:40, BeatBox (adjacent) starts 16:10 → plenty of time.
    const perfs = [perf('a', 'ghost', '15:00', '15:40'), perf('b', 'beatbox', '16:10', '16:50')];
    const conflicts = detectConflicts('saturday', ctx(perfs, [sel('a'), sel('b')]));
    expect(conflicts.some((c) => c.type === 'insufficient-travel')).toBe(false);
    expect(conflicts.some((c) => c.type === 'overlap')).toBe(false);
  });

  it('reports missing stage and missing time', () => {
    const p1: Performance = { ...perf('a', 'ghost', '15:00'), stageId: null };
    const p2: Performance = { ...perf('b', 'rex', '15:00'), startTime: null };
    const conflicts = detectConflicts('saturday', ctx([p1, p2], [sel('a'), sel('b')]));
    expect(conflicts.some((c) => c.type === 'missing-stage')).toBe(true);
    expect(conflicts.some((c) => c.type === 'missing-time')).toBe(true);
  });

  it('labels overlaps that rely on an estimated end time', () => {
    // 'a' has no end; next set on the SAME stage gives an estimate.
    const perfs = [
      perf('a', 'ghost', '15:00'),
      perf('filler', 'ghost', '15:50'),
      perf('b', 'rex', '15:30', '16:00'),
    ];
    const conflicts = detectConflicts('saturday', ctx(perfs, [sel('a'), sel('b')]));
    const overlap = conflicts.find((c) => c.type === 'overlap' || c.type === 'must-see-conflict');
    expect(overlap?.usesEstimatedTime).toBe(true);
  });
});
