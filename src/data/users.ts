import type { User } from '@/domain/types';

// Initial sample profiles (spec §6). Initials used until profile images added.
// Do NOT invent photographs of Robbie, Ari, or Morgan.
export const SEED_USERS: User[] = [
  { id: 'robbie', name: 'Robbie', initials: 'R', avatar: null, colorKey: 'pink' },
  { id: 'ari', name: 'Ari', initials: 'A', avatar: null, colorKey: 'blue' },
  { id: 'morgan', name: 'Morgan', initials: 'M', avatar: null, colorKey: 'orange' },
];

/** Tailwind-independent color values per colorKey (for avatars, markers, accents). */
export const COLOR_VALUES: Record<string, { bg: string; ring: string; text: string }> = {
  pink: { bg: '#ff2d78', ring: '#ff2d78', text: '#ffffff' },
  blue: { bg: '#2f66c4', ring: '#2f66c4', text: '#ffffff' },
  orange: { bg: '#ff7a1a', ring: '#ff7a1a', text: '#ffffff' },
  teal: { bg: '#17b3a3', ring: '#17b3a3', text: '#ffffff' },
  yellow: { bg: '#ffd21e', ring: '#e8b800', text: '#0a0f1c' },
  purple: { bg: '#8b5cf6', ring: '#8b5cf6', text: '#ffffff' },
};
