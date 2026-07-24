import { Droplets, Toilet, Cross, Backpack, DoorOpen, Utensils, ShoppingBag } from 'lucide-react';
import { cx } from '@/components/ui';
import type { FilterKey } from './markerMeta';
import type { MapLocation } from '@/domain/types';

export interface Essential {
  key: FilterKey;
  label: string;
  Icon: typeof Droplets;
  /** Category / amenity types a pin must match to satisfy this need. */
  match: (loc: MapLocation) => boolean;
}

const amenity = (types: string[]) => (loc: MapLocation) =>
  loc.category === 'amenity' && !!loc.amenityType && types.includes(loc.amenityType);

/**
 * The things people actually open a festival map for (add-on §6).
 *
 * Stages are what the map is *about*, but water, toilets and first aid are
 * what you need in a hurry — so they get one tap each instead of a scroll
 * through eighteen filter chips.
 */
export const ESSENTIALS: Essential[] = [
  { key: 'water', label: 'Water', Icon: Droplets, match: amenity(['Water Stations', 'VIP Water Stations']) },
  { key: 'restrooms', label: 'Restrooms', Icon: Toilet, match: amenity(['Restrooms', 'VIP Restrooms']) },
  { key: 'firstaid', label: 'First Aid', Icon: Cross, match: amenity(['First Aid']) },
  { key: 'lockers', label: 'Lockers', Icon: Backpack, match: amenity(['Lockers', 'VIP Lockers']) },
  { key: 'entrances', label: 'Entrance', Icon: DoorOpen, match: (l) => l.category === 'entrance' },
  { key: 'food', label: 'Food', Icon: Utensils, match: amenity(['Food', 'Food Truck', 'VIP Food', 'VIP Food Truck']) },
  { key: 'merch', label: 'Merch', Icon: ShoppingBag, match: amenity(['Warped Merch', 'General Store', 'Vendor Village']) },
];

export function EssentialsStrip({
  active,
  onPick,
  className,
}: {
  active: FilterKey | null;
  onPick: (essential: Essential) => void;
  className?: string;
}) {
  return (
    <div
      className={cx('no-scrollbar scroll-fade-r flex gap-1.5 overflow-x-auto', className)}
      role="group"
      aria-label="Festival essentials"
    >
      {ESSENTIALS.map((e) => (
        <button
          key={e.key}
          type="button"
          onClick={() => onPick(e)}
          aria-pressed={active === e.key}
          className={cx(
            'inline-flex min-h-touch shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-1',
            active === e.key
              ? 'border-warp-yellow bg-warp-yellow text-warp-ink'
              : 'border-subtle bg-[var(--surface-card)] text-secondary',
          )}
        >
          <e.Icon size={17} aria-hidden />
          <span className="text-[11px] font-bold">{e.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Nearest matching pin to a reference point, by isotropic map distance. */
export function nearestMatch(
  locations: MapLocation[],
  essential: Essential,
  from: { xPercent: number; yPercent: number } | null,
  aspect: number,
): MapLocation | null {
  const candidates = locations.filter(essential.match);
  if (!candidates.length) return null;
  if (!from) return candidates[0];
  let best = candidates[0];
  let bestD = Infinity;
  for (const c of candidates) {
    const dx = c.xPercent - from.xPercent;
    const dy = (c.yPercent - from.yPercent) * aspect;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
