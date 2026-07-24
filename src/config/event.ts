// Event configuration — spec §2. Do not display fictional schedule data in production.

export const EVENT = {
  id: 'warped-long-beach-2026',
  name: 'Vans Warped Tour Long Beach',
  venue: 'Shoreline Waterfront',
  address: '386 East Shoreline Drive, Long Beach, CA 90802',
  timezone: 'America/Los_Angeles',
  festivalHours: {
    opens: '11:00',
    closes: '22:00',
  },
  days: [
    { id: 'saturday', label: 'Saturday', date: '2026-07-25' },
    { id: 'sunday', label: 'Sunday', date: '2026-07-26' },
  ],
} as const;

export type EventDay = (typeof EVENT.days)[number];

export const APP_NAME = 'Warped Long Beach Companion';
export const APP_DISCLAIMER =
  'Unofficial personal companion app. Not affiliated with or endorsed by Vans or Vans Warped Tour.';

/** Base path used for asset URLs (matches vite base + PWA scope). */
export const BASE_URL = import.meta.env.BASE_URL;

export const MAP_IMAGE_URL = `${BASE_URL}map/festival-map.webp`;
