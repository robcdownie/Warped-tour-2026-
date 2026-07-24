import { describe, it, expect } from 'vitest';
import { plannedPosition } from './positions';
import { hhmmToMinutes } from './time';
import type { Performance, Selection, MapLocation } from './types';

const stages: MapLocation[] = [
  { id: 'ghost', name: 'Ghost Stage', shortName: 'Ghost', category: 'stage', xPercent: 93, yPercent: 45 },
  { id: 'doordash', name: 'DoorDash Stage', shortName: 'DoorDash', category: 'stage', xPercent: 77, yPercent: 72 },
];

function perf(id: string, stageId: string, start: string, end: string): Performance {
  return { id, artistId: id, type: 'main', day: 'saturday', stageId, startTime: start, endTime: end, estimatedEndTime: null, scheduleStatus: 'scheduled' };
}
function sel(pid: string): Selection {
  return { userId: 'robbie', performanceId: pid, priority: 'must-see', selected: true, attendanceDecision: 'attending', notes: '' };
}

const perfs = [perf('a', 'ghost', '15:00', '15:40'), perf('b', 'doordash', '16:30', '17:10')];
const ctx = {
  selections: [sel('a'), sel('b')],
  performanceById: new Map(perfs.map((p) => [p.id, p])),
  locationById: new Map(stages.map((s) => [s.id, s])),
  allPerformances: perfs,
  crowd: 'normal' as const,
  turnoverBuffer: 10,
  overrides: [],
};

describe('planned positions (spec §24)', () => {
  it('is at the stage during a set', () => {
    const p = plannedPosition('robbie', 'saturday', hhmmToMinutes('15:20'), ctx);
    expect(p.kind).toBe('at-stage');
    expect(p.locationId).toBe('ghost');
    expect(p.source).toBe('planned');
  });

  it('shows open time between sets', () => {
    const p = plannedPosition('robbie', 'saturday', hhmmToMinutes('15:50'), ctx);
    expect(p.kind).toBe('open');
  });

  it('shows traveling toward the next stage inside the travel window', () => {
    // DoorDash set starts 16:30; the walk is a few minutes, so just before the
    // start the user is en route.
    const p = plannedPosition('robbie', 'saturday', hhmmToMinutes('16:29'), ctx);
    expect(p.kind).toBe('traveling');
    expect(p.towardLocationId).toBe('doordash');
  });

  it('never labels a planned position as live', () => {
    const p = plannedPosition('robbie', 'saturday', hhmmToMinutes('15:20'), ctx);
    expect(p.source).not.toBe('live');
  });

  it('reports open time when nothing is planned', () => {
    const empty = { ...ctx, selections: [] as Selection[] };
    const p = plannedPosition('robbie', 'saturday', hhmmToMinutes('15:20'), empty);
    expect(p.kind).toBe('open');
  });
});
