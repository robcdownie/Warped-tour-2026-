// Core data model for Warped Long Beach Companion.
// These types mirror the IndexedDB stores and the spec's record shapes.

export type DayId = 'saturday' | 'sunday';

export type ArtistCategory = 'main-lineup' | 'unplugged-special';

export type PerformanceType = 'main' | 'unplugged';

export type ScheduleStatus = 'time-pending' | 'scheduled' | 'confirmed';

export type Priority = 'must-see' | 'want-to-see' | 'optional';

export type AttendanceDecision = 'undecided' | 'attending' | 'skipping';

export type PositionSource = 'planned' | 'manual' | 'live' | 'stale';

export type CrowdDelay = 'light' | 'normal' | 'heavy';

export type ColorKey = 'pink' | 'blue' | 'orange' | 'teal' | 'yellow' | 'purple';

export interface Artist {
  id: string;
  name: string;
  searchAliases: string[];
  category: ArtistCategory;
}

export interface Performance {
  id: string;
  artistId: string;
  type: PerformanceType;
  /** Confirmed festival day. Null for Unplugged appearances until announced. */
  day: DayId | null;
  stageId: string | null;
  /** "HH:mm" 24h local (America/Los_Angeles) or null when unknown. */
  startTime: string | null;
  endTime: string | null;
  estimatedEndTime: string | null;
  scheduleStatus: ScheduleStatus;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  /** Data URL of a locally-stored avatar image, or null. */
  avatar: string | null;
  colorKey: ColorKey;
}

export interface Selection {
  userId: string;
  performanceId: string;
  priority: Priority;
  selected: boolean;
  attendanceDecision: AttendanceDecision;
  notes: string;
  /** Set when the user skipped this because of a detected conflict. */
  skippedForConflict?: boolean;
}

export type LocationCategory =
  | 'stage'
  | 'entrance'
  | 'experience'
  | 'extreme-sports'
  | 'bar'
  | 'sponsor'
  | 'service'
  | 'vendor'
  | 'amenity'
  | 'custom';

export interface MapLocation {
  id: string;
  name: string;
  shortName?: string;
  category: LocationCategory;
  /** Amenity legend key (e.g. "Restrooms", "First Aid") when category === 'amenity'. */
  amenityType?: string;
  xPercent: number;
  yPercent: number;
  /** True for user-added pins (deletable in calibration). Seed pins are false. */
  custom?: boolean;
}

export interface CheckIn {
  id: string;
  userId: string;
  locationId: string | null;
  customCoordinates: { xPercent: number; yPercent: number } | null;
  source: 'manual' | 'live';
  updatedAt: string; // ISO timestamp
}

export interface TravelOverride {
  /** "aStageId|bStageId" sorted, or "locA|locB". */
  pairKey: string;
  minutes: number;
}

/** Per-user metadata about the last selection import. */
export interface FriendImportMeta {
  userId: string;
  importedAt: string; // ISO
  selectionCount: number;
}

export interface AppSettings {
  activeUserId: string;
  staleMinutes: number;
  crowdDelay: CrowdDelay;
  /** Stage turnover buffer (minutes) for estimated end times. */
  turnoverBuffer: number;
  adminUnlocked: boolean;
  offlineReady: boolean;
  theme: 'system' | 'light' | 'dark';
  /** Allow meetups to interrupt must-see sets (default false). */
  allowMeetupDuringMustSee: boolean;
  minMeetupMinutes: number;
  friendImports: Record<string, FriendImportMeta>;
}

export interface HistoryEntry {
  id?: number;
  ts: string;
  kind: string;
  summary: string;
  /** Enough info to undo a schedule edit. */
  undo?: {
    performanceId: string;
    before: Pick<
      Performance,
      'stageId' | 'startTime' | 'endTime' | 'estimatedEndTime' | 'scheduleStatus' | 'day'
    >;
  };
}

export interface BackupSnapshot {
  id?: number;
  ts: string;
  label: string;
  /** JSON snapshot of affected stores prior to an import (for rollback). */
  data: unknown;
}
