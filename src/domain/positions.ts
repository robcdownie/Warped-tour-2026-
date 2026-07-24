import type {
  Performance,
  Selection,
  MapLocation,
  CheckIn,
  CrowdDelay,
  TravelOverride,
  DayId,
  PositionSource,
} from './types';
import { withEffectiveEnds } from './endTimes';
import { travelMinutes, overrideMap } from './travel';
import { hhmmToMinutes } from './time';
import { ENTRANCE_LOCATION_ID } from '@/config/event';

// Planned friend positions (spec §24). Computed purely from selections,
// attendance decisions, set times, and stage locations. NEVER a live location.
// Manual check-ins can override while fresh (spec §25).

export interface PlannedPosition {
  userId: string;
  atMinute: number;
  kind: 'at-stage' | 'traveling' | 'open' | 'not-arrived' | 'done' | 'checked-in';
  locationId?: string;
  towardLocationId?: string;
  performanceId?: string;
  label: string;
  source: PositionSource;
  /** For check-ins: minutes since the check-in (for staleness display). */
  ageMinutes?: number;
}

interface Stop {
  perf: Performance;
  start: number;
  end: number;
  stage?: MapLocation;
}

/**
 * Where a user plans to be at minute T on a given day (from their attending
 * itinerary). Used by the map time slider and the Now/Group screens.
 */
export function plannedPosition(
  userId: string,
  day: DayId,
  atMinute: number,
  ctx: {
    selections: Selection[];
    performanceById: Map<string, Performance>;
    locationById: Map<string, MapLocation>;
    allPerformances: Performance[];
    crowd: CrowdDelay;
    turnoverBuffer: number;
    overrides: TravelOverride[];
  },
): PlannedPosition {
  const ends = withEffectiveEnds(ctx.allPerformances, ctx.turnoverBuffer);
  const omap = overrideMap(ctx.overrides);

  const stops: Stop[] = ctx.selections
    .filter((s) => {
      if (s.userId !== userId || !s.selected) return false;
      if (s.attendanceDecision === 'skipping') return false;
      const p = ctx.performanceById.get(s.performanceId);
      return p?.day === day && p.type === 'main' && p.startTime && p.stageId;
    })
    .map((s) => {
      const p = ctx.performanceById.get(s.performanceId)!;
      const end = ends.get(p.id)?.minutes ?? hhmmToMinutes(p.startTime!) + 30;
      return {
        perf: p,
        start: hhmmToMinutes(p.startTime!),
        end,
        stage: p.stageId ? ctx.locationById.get(p.stageId) : undefined,
      };
    })
    .sort((a, b) => a.start - b.start);

  const base = { userId, atMinute, source: 'planned' as const };

  if (stops.length === 0) {
    return { ...base, kind: 'open', label: 'Open time (no plan yet)' };
  }

  // Currently in a set?
  const current = stops.find((s) => atMinute >= s.start && atMinute < s.end);
  if (current) {
    return {
      ...base,
      kind: 'at-stage',
      locationId: current.stage?.id,
      performanceId: current.perf.id,
      label: current.stage?.name ?? 'a stage',
    };
  }

  const next = stops.find((s) => s.start > atMinute);
  const prev = [...stops].reverse().find((s) => s.end <= atMinute);

  // Before the first set.
  if (!prev && next) {
    // Traveling to the first set if within its travel window from the entrance.
    // (An undefined origin would short-circuit travelMinutes to 0 and make the
    // 'traveling' state unreachable — use the real entrance location.)
    const entrance = ctx.locationById.get(ENTRANCE_LOCATION_ID);
    const travel = travelMinutes(entrance, next.stage, ctx.crowd, omap);
    if (atMinute >= next.start - travel.minutes) {
      return {
        ...base,
        kind: 'traveling',
        towardLocationId: next.stage?.id,
        performanceId: next.perf.id,
        label: `Heading to ${next.stage?.name ?? 'first set'}`,
      };
    }
    return { ...base, kind: 'not-arrived', label: 'Not at their first set yet' };
  }

  // Between sets.
  if (prev && next) {
    const travel = travelMinutes(prev.stage, next.stage, ctx.crowd, omap);
    if (atMinute >= next.start - travel.minutes) {
      return {
        ...base,
        kind: 'traveling',
        locationId: prev.stage?.id,
        towardLocationId: next.stage?.id,
        performanceId: next.perf.id,
        label: `Traveling toward ${next.stage?.name ?? 'next set'}`,
      };
    }
    // Open time — shown at the most recent planned landmark.
    return {
      ...base,
      kind: 'open',
      locationId: prev.stage?.id,
      label: `Open time near ${prev.stage?.shortName ?? prev.stage?.name ?? 'last stage'}`,
    };
  }

  // After the last set.
  if (prev && !next) {
    return {
      ...base,
      kind: 'done',
      locationId: prev.stage?.id,
      label: `Wrapped up near ${prev.stage?.shortName ?? prev.stage?.name ?? 'last stage'}`,
    };
  }

  return { ...base, kind: 'open', label: 'Open time' };
}

/**
 * Position that honors a fresh manual check-in over the planned position.
 * A check-in older than staleMinutes is treated as stale (spec §25) — we still
 * show it but flag the source as 'stale' and fall back to planned semantics.
 */
export function positionWithCheckin(
  userId: string,
  day: DayId,
  atMinute: number,
  checkins: CheckIn[],
  nowMs: number,
  staleMinutes: number,
  ctx: Parameters<typeof plannedPosition>[3],
): PlannedPosition {
  const mine = checkins
    .filter((c) => c.userId === userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const latest = mine[0];
  if (latest) {
    const ageMinutes = Math.floor((nowMs - new Date(latest.updatedAt).getTime()) / 60000);
    const stale = ageMinutes >= staleMinutes;
    const loc = latest.locationId ? ctx.locationById.get(latest.locationId) : undefined;
    return {
      userId,
      atMinute,
      kind: 'checked-in',
      locationId: latest.locationId ?? undefined,
      label: loc ? loc.name : latest.customCoordinates ? 'Custom pin' : 'Checked in',
      source: stale ? 'stale' : 'manual',
      ageMinutes,
    };
  }
  return plannedPosition(userId, day, atMinute, ctx);
}
