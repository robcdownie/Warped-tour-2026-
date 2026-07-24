import type { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  activeUserId: 'robbie',
  staleMinutes: 20,
  crowdDelay: 'normal',
  turnoverBuffer: 10,
  adminUnlocked: false,
  offlineReady: false,
  theme: 'system',
  allowMeetupDuringMustSee: false,
  minMeetupMinutes: 15,
  friendImports: {},
};

/** Crowd-delay multipliers applied to base travel estimates. */
export const CROWD_MULTIPLIER: Record<AppSettings['crowdDelay'], number> = {
  light: 1.0,
  normal: 1.4,
  heavy: 1.8,
};
