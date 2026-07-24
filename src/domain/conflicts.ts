import type {
  Performance,
  Selection,
  MapLocation,
  CrowdDelay,
  TravelOverride,
  DayId,
  Priority,
} from './types';
import { withEffectiveEnds, type EffectiveEnd } from './endTimes';
import { travelMinutes, overrideMap } from './travel';
import { formatTime, formatDuration } from './time';

export type ConflictType =
  | 'overlap' // direct time overlap
  | 'must-see-conflict' // must-see vs must-see overlap
  | 'insufficient-travel'
  | 'back-to-back' // 3+ in a row
  | 'undecided-attendance'
  | 'unknown-end'
  | 'missing-stage'
  | 'missing-time';

export type ConflictSeverity = 'info' | 'warn' | 'high';

export interface ConflictAction {
  kind: 'attend' | 'undecided' | 'ignore' | 'prioritize';
  label: string;
  /** Performance to mark attending (others in the conflict become skipping). */
  attendId?: string;
  performanceIds?: string[];
}

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  performanceIds: string[];
  title: string;
  message: string;
  usesEstimatedTime: boolean;
  actions: ConflictAction[];
}

export interface ConflictContext {
  userId: string;
  selections: Selection[];
  performanceById: Map<string, Performance>;
  locationById: Map<string, MapLocation>;
  allPerformances: Performance[];
  crowd: CrowdDelay;
  turnoverBuffer: number;
  overrides: TravelOverride[];
}

interface Scheduled {
  perf: Performance;
  sel: Selection;
  start: number;
  end: EffectiveEnd;
  stage?: MapLocation;
}

const PRIORITY_RANK: Record<Priority, number> = {
  'must-see': 0,
  'want-to-see': 1,
  optional: 2,
};

/** Detect all conflicts for one user on one day. */
export function detectConflicts(day: DayId, ctx: ConflictContext): Conflict[] {
  const ends = withEffectiveEnds(ctx.allPerformances, ctx.turnoverBuffer);
  const omap = overrideMap(ctx.overrides);
  const conflicts: Conflict[] = [];

  // Gather this user's active selections for the day.
  const active: { perf: Performance; sel: Selection }[] = [];
  for (const sel of ctx.selections) {
    if (sel.userId !== ctx.userId || !sel.selected) continue;
    if (sel.attendanceDecision === 'skipping') continue;
    const perf = ctx.performanceById.get(sel.performanceId);
    if (!perf || perf.day !== day || perf.type !== 'main') continue;
    active.push({ perf, sel });
  }

  // Missing-data conflicts.
  for (const { perf, sel } of active) {
    if (!perf.stageId) {
      conflicts.push({
        id: `missing-stage-${perf.id}`,
        type: 'missing-stage',
        severity: 'info',
        performanceIds: [perf.id],
        title: 'Stage not set',
        message: 'This set has no stage yet. It will be checked for conflicts once a stage is entered.',
        usesEstimatedTime: false,
        actions: [],
      });
    }
    if (!perf.startTime) {
      conflicts.push({
        id: `missing-time-${perf.id}`,
        type: 'missing-time',
        severity: 'info',
        performanceIds: [perf.id],
        title: 'Set time not set',
        message: 'No start time yet — add it in the Schedule editor to check for overlaps.',
        usesEstimatedTime: false,
        actions: [],
      });
    } else if (ends.get(perf.id)?.kind === 'unknown') {
      conflicts.push({
        id: `unknown-end-${perf.id}`,
        type: 'unknown-end',
        severity: 'info',
        performanceIds: [perf.id],
        title: 'End time unknown',
        message:
          'No end time and nothing scheduled after it on this stage, so overlap can only be estimated from the start time.',
        usesEstimatedTime: false,
        actions: [],
      });
    }
    void sel;
  }

  // Fully-scheduled sets (start + stage) for overlap/travel analysis.
  const scheduled: Scheduled[] = active
    .filter((a) => a.perf.startTime && a.perf.stageId)
    .map((a) => ({
      perf: a.perf,
      sel: a.sel,
      start: hh(a.perf.startTime!),
      end: ends.get(a.perf.id)!,
      stage: a.perf.stageId ? ctx.locationById.get(a.perf.stageId) : undefined,
    }))
    .sort((x, y) => x.start - y.start);

  // Pairwise overlap + travel.
  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      const a = scheduled[i];
      const b = scheduled[j];
      const aEnd = a.end.minutes ?? a.start + 30; // fallback window if unknown
      const bEnd = b.end.minutes ?? b.start + 30;
      const usesEstimated = a.end.kind === 'estimated' || b.end.kind === 'estimated';

      const overlaps = a.start < bEnd && b.start < aEnd;
      if (overlaps) {
        const bothMustSee =
          a.sel.priority === 'must-see' && b.sel.priority === 'must-see';
        conflicts.push(
          buildOverlap(a, b, bothMustSee, usesEstimated),
        );
        // Undecided attendance on an overlapping pair.
        if (
          a.sel.attendanceDecision === 'undecided' &&
          b.sel.attendanceDecision === 'undecided'
        ) {
          conflicts.push({
            id: `undecided-${a.perf.id}-${b.perf.id}`,
            type: 'undecided-attendance',
            severity: 'warn',
            performanceIds: [a.perf.id, b.perf.id],
            title: 'No decision yet',
            message: `You haven't chosen between these overlapping sets. Pick one to attend so your plan and meetups stay accurate.`,
            usesEstimatedTime: usesEstimated,
            actions: attendActions(a, b),
          });
        }
      } else if (b.start >= aEnd && a.stage && b.stage && a.stage.id !== b.stage.id) {
        // Consecutive on different stages — check walking time.
        const gap = b.start - aEnd;
        const t = travelMinutes(a.stage, b.stage, ctx.crowd, omap);
        if (gap < t.minutes) {
          conflicts.push({
            id: `travel-${a.perf.id}-${b.perf.id}`,
            type: 'insufficient-travel',
            severity: 'warn',
            performanceIds: [a.perf.id, b.perf.id],
            title: 'Tight walk between sets',
            message:
              `A set ends around ${formatMin(aEnd)} at ${a.stage.shortName ?? a.stage.name}, ` +
              `and the next starts ${formatMin(b.start)} at ${b.stage.shortName ?? b.stage.name}. ` +
              `Only ${formatDuration(gap)} between them but the walk is about ${formatDuration(t.minutes)} ` +
              `(${a.end.kind === 'estimated' ? 'estimated end' : 'exact end'}, approximate walk). ` +
              `These may not be realistically compatible.`,
            usesEstimatedTime: usesEstimated,
            actions: attendActions(a, b),
          });
        }
      }
    }
  }

  // Back-to-back stamina: 3+ sets each starting within 10 min of the prior end.
  const runs = findBackToBackRuns(scheduled, 10);
  for (const run of runs) {
    conflicts.push({
      id: `b2b-${run.map((r) => r.perf.id).join('-')}`,
      type: 'back-to-back',
      severity: 'info',
      performanceIds: run.map((r) => r.perf.id),
      title: `${run.length} sets back-to-back`,
      message: `You have ${run.length} sets in a row with little downtime. Consider a break or a meetup in the middle.`,
      usesEstimatedTime: run.some((r) => r.end.kind === 'estimated'),
      actions: [],
    });
  }

  return conflicts;
}

function buildOverlap(
  a: Scheduled,
  b: Scheduled,
  bothMustSee: boolean,
  usesEstimated: boolean,
): Conflict {
  const higher = PRIORITY_RANK[a.sel.priority] <= PRIORITY_RANK[b.sel.priority] ? a : b;
  const aName = a.stage?.shortName ?? a.stage?.name ?? 'a stage';
  const bStageName = b.stage?.shortName ?? b.stage?.name ?? 'a stage';
  return {
    id: `overlap-${a.perf.id}-${b.perf.id}`,
    type: bothMustSee ? 'must-see-conflict' : 'overlap',
    severity: bothMustSee ? 'high' : 'warn',
    performanceIds: [a.perf.id, b.perf.id],
    title: bothMustSee ? 'Two Must-See sets clash' : 'Overlapping sets',
    message:
      `These overlap: one at ${formatMin(a.start)} (${aName}) and one at ${formatMin(b.start)} (${bStageName}). ` +
      (usesEstimated ? 'Overlap uses an estimated end time. ' : 'Based on exact times. ') +
      (bothMustSee
        ? 'Both are marked Must-See — you can only catch part of each.'
        : `Higher priority right now: ${higher === a ? aName : bStageName}.`),
    usesEstimatedTime: usesEstimated,
    actions: attendActions(a, b),
  };
}

function attendActions(a: Scheduled, b: Scheduled): ConflictAction[] {
  return [
    { kind: 'attend', label: `Attend the ${a.start <= b.start ? 'first' : 'second'} set`, attendId: a.perf.id, performanceIds: [a.perf.id, b.perf.id] },
    { kind: 'attend', label: `Attend the ${b.start > a.start ? 'second' : 'first'} set`, attendId: b.perf.id, performanceIds: [a.perf.id, b.perf.id] },
    { kind: 'undecided', label: 'Keep both undecided', performanceIds: [a.perf.id, b.perf.id] },
    { kind: 'ignore', label: 'Ignore warning', performanceIds: [a.perf.id, b.perf.id] },
  ];
}

function findBackToBackRuns(scheduled: Scheduled[], gapThreshold: number): Scheduled[][] {
  const runs: Scheduled[][] = [];
  let cur: Scheduled[] = [];
  for (let i = 0; i < scheduled.length; i++) {
    if (cur.length === 0) {
      cur = [scheduled[i]];
      continue;
    }
    const prev = cur[cur.length - 1];
    const prevEnd = prev.end.minutes ?? prev.start + 30;
    if (scheduled[i].start - prevEnd <= gapThreshold && scheduled[i].start >= prev.start) {
      cur.push(scheduled[i]);
    } else {
      if (cur.length >= 3) runs.push(cur);
      cur = [scheduled[i]];
    }
  }
  if (cur.length >= 3) runs.push(cur);
  return runs;
}

// helpers
function hh(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return formatTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
}

/** Count of conflicts by severity (for badges). */
export function conflictSummary(conflicts: Conflict[]): {
  high: number;
  warn: number;
  info: number;
  total: number;
} {
  return {
    high: conflicts.filter((c) => c.severity === 'high').length,
    warn: conflicts.filter((c) => c.severity === 'warn').length,
    info: conflicts.filter((c) => c.severity === 'info').length,
    total: conflicts.length,
  };
}
