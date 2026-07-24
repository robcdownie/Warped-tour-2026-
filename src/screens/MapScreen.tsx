import { useMemo, useRef, useState } from 'react';
import { MapPin, Crosshair, X, Check, Clock, Sparkles, Filter, SlidersHorizontal } from 'lucide-react';
import { Button, cx } from '@/components/ui';
import { MapCanvas, type MapCanvasHandle } from './map/MapCanvas';
import { LocationPin, FriendPin } from './map/MapPins';
import { FriendAvatar } from '@/components/FriendAvatar';
import { useApp } from '@/store/appStore';
import { useGroupCtx } from '@/hooks/useGroupCtx';
import { useClock } from '@/hooks/useClock';
import { positionWithCheckin } from '@/domain/positions';
import { locationVisible, stagesWithSelections } from './map/visibility';
import { FILTER_LABELS, type FilterKey } from './map/markerMeta';
import { getNow, formatMinutes, hhmmToMinutes, formatRelative } from '@/domain/time';
import { EVENT } from '@/config/event';
import type { MenuRoute } from '@/components/MenuDrawer';
import type { DayId, MapLocation } from '@/domain/types';

const OPEN = hhmmToMinutes(EVENT.festivalHours.opens);
const CLOSE = hhmmToMinutes(EVENT.festivalHours.closes);

function clampPct(n: number): number {
  return Math.max(2, Math.min(98, n));
}

const FILTER_ORDER: FilterKey[] = [
  'friends', 'stages', 'selected', 'food', 'water', 'restrooms', 'firstaid',
  'bars', 'lockers', 'merch', 'accessibility', 'vip', 'entrances',
  'experiences', 'extreme', 'vendors', 'sponsor', 'custom',
];

export function MapScreen({ onOpenMenu }: { onOpenMenu: (r: MenuRoute) => void }) {
  const now = useClock(30000);
  const nowInfo = getNow(now);
  const defaultDay: DayId = nowInfo.day ?? 'saturday';

  const locations = useApp((s) => s.locations);
  const checkins = useApp((s) => s.checkins);
  const selections = useApp((s) => s.selections);
  const performanceById = useApp((s) => s.performanceById);
  const activeUserId = useApp((s) => s.settings.activeUserId);
  const staleMinutes = useApp((s) => s.settings.staleMinutes);
  const putCheckIn = useApp((s) => s.putCheckIn);
  const ctx = useGroupCtx();

  // Stages + entrances start explicitly ON (they used to be an invisible
  // "empty set" default, which made the Stages chip look like a no-op — the
  // chips should honestly reflect what's on the map).
  const [active, setActive] = useState<Set<FilterKey>>(new Set(['friends', 'stages', 'entrances']));
  const [matterNow, setMatterNow] = useState(false);
  const [day, setDay] = useState<DayId>(defaultDay);
  const [sliderMin, setSliderMin] = useState<number>(() =>
    nowInfo.day ? Math.min(CLOSE, Math.max(OPEN, nowInfo.minutes)) : 15 * 60,
  );
  const [followNow, setFollowNow] = useState(nowInfo.day != null);
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const [checkInMode, setCheckInMode] = useState(false);
  const mapRef = useRef<MapCanvasHandle>(null);

  const atMinute = followNow && nowInfo.day ? Math.min(CLOSE, Math.max(OPEN, nowInfo.minutes)) : sliderMin;

  const selectedStages = useMemo(
    () => stagesWithSelections(selections, performanceById),
    [selections, performanceById],
  );

  const locFilters = useMemo(() => new Set([...active].filter((k) => k !== 'friends')), [active]);
  const showFriends = active.has('friends') || matterNow;

  // Friend positions at the chosen time. Co-located friends get a small x offset
  // so all avatars stay visible instead of stacking on one point.
  const friendPositions = useMemo(() => {
    const raw = ctx.users.map((u) => {
      const pos = positionWithCheckin(u.id, day, atMinute, checkins, now.getTime(), staleMinutes, {
        selections: ctx.selections,
        performanceById: ctx.performanceById,
        locationById: ctx.locationById,
        allPerformances: ctx.allPerformances,
        crowd: ctx.crowd,
        turnoverBuffer: ctx.turnoverBuffer,
        overrides: ctx.overrides,
      });
      const locId = pos.towardLocationId ?? pos.locationId;
      const loc = locId ? ctx.locationById.get(locId) : undefined;
      return { user: u, pos, loc };
    });
    const seen = new Map<string, number>();
    return raw.map((r) => {
      if (!r.loc) return r;
      const n = seen.get(r.loc.id) ?? 0;
      seen.set(r.loc.id, n + 1);
      if (n === 0) return r;
      // Fan out extra avatars horizontally around the anchor.
      const dir = n % 2 === 1 ? 1 : -1;
      const mag = Math.ceil(n / 2) * 3.2;
      return { ...r, loc: { ...r.loc, xPercent: clampPct(r.loc.xPercent + dir * mag) } };
    });
  }, [ctx, day, atMinute, checkins, now, staleMinutes]);

  // "Matter now" essential amenity types.
  const matterAmenity = new Set(['Water Stations', 'Restrooms', 'First Aid']);

  const visibleLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (matterNow) {
        if (loc.category === 'stage') return selectedStages.has(loc.id);
        if (loc.category === 'amenity') return loc.amenityType ? matterAmenity.has(loc.amenityType) : false;
        return false;
      }
      return locationVisible(loc, locFilters, selectedStages);
    });
  }, [locations, matterNow, locFilters, selectedStages]);

  const toggle = (k: FilterKey) => {
    setMatterNow(false);
    setActive((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const onLocationTap = (loc: MapLocation) => {
    setSelected(loc);
    mapRef.current?.centerOn(loc.xPercent, loc.yPercent, 2.4);
  };

  const doCheckIn = async (loc: MapLocation | null, coords?: { xPercent: number; yPercent: number }) => {
    await putCheckIn({
      id: `checkin-${activeUserId}-${Date.now()}`,
      userId: activeUserId,
      locationId: loc?.id ?? null,
      customCoordinates: coords ?? null,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    });
    setCheckInMode(false);
    setSelected(null);
  };

  const myCheckin = checkins
    .filter((c) => c.userId === activeUserId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="px-3 pt-2">
        <div className="no-scrollbar scroll-fade-r flex gap-1.5 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setMatterNow((v) => !v)}
            className={cx(
              'inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-[13px] font-bold',
              matterNow ? 'border-warp-yellow bg-warp-yellow text-warp-ink' : 'border-warp-yellow/60 bg-warp-yellow/10 text-warn',
            )}
          >
            <Sparkles size={14} aria-hidden /> Now
          </button>
          {FILTER_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              onClick={(e) => {
                toggle(k);
                e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
              }}
              aria-pressed={active.has(k)}
              className={cx(
                'inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-[13px] font-semibold',
                active.has(k) && !matterNow ? 'border-[var(--chip-on-border)] bg-[var(--chip-on)] text-white' : 'border-subtle bg-[var(--surface-card)] text-secondary',
              )}
            >
              {FILTER_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 px-3">
        <MapCanvas
          ref={mapRef}
          className="h-full min-h-[380px]"
          onBackgroundTap={(x, y) => {
            if (checkInMode) doCheckIn(null, { xPercent: x, yPercent: y });
          }}
        >
          {visibleLocations.map((loc) => (
            <LocationPin
              key={loc.id}
              loc={loc}
              labeled={loc.category === 'stage'}
              highlighted={loc.category === 'stage' && selectedStages.has(loc.id) && (active.has('selected') || matterNow)}
              onClick={() => onLocationTap(loc)}
            />
          ))}
          {showFriends &&
            friendPositions.map(({ user, pos, loc }) =>
              loc ? (
                <FriendPin key={user.id} user={user} position={pos} loc={loc} onClick={() => setSelected(loc)} />
              ) : null,
            )}
        </MapCanvas>

        {/* Calibrate shortcut */}
        <button
          type="button"
          onClick={() => onOpenMenu('calibration')}
          aria-label="Map calibration"
          className="absolute left-5 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-warp-ink shadow-md active:bg-white"
        >
          <SlidersHorizontal size={17} aria-hidden />
        </button>

        {/* Empty hint if map has nothing */}
        {visibleLocations.length === 0 && !showFriends && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-[12px] text-white">
              <Filter size={13} aria-hidden /> No pins for these filters
            </span>
          </div>
        )}

        {/* Check-in mode banner */}
        {checkInMode && (
          <div className="absolute inset-x-3 top-2 z-10 flex items-center gap-2 rounded-xl bg-warp-blue-800/95 px-3 py-2 text-white shadow-lg">
            <Crosshair size={16} aria-hidden />
            <span className="flex-1 text-[13px] font-semibold">Tap the map or a pin to check in</span>
            <button type="button" onClick={() => setCheckInMode(false)} aria-label="Cancel" className="p-1">
              <X size={16} aria-hidden />
            </button>
          </div>
        )}

        {/* Location detail card */}
        {selected && (
          <LocationCard
            loc={selected}
            friendsHere={friendPositions.filter((f) => f.loc?.id === selected.id).map((f) => f.user)}
            onClose={() => setSelected(null)}
            onCheckIn={() => doCheckIn(selected)}
            onRecenter={() => mapRef.current?.centerOn(selected.xPercent, selected.yPercent, 2.6)}
          />
        )}
      </div>

      {/* Bottom controls: time slider + check-in */}
      <div className="border-t border-subtle bg-[var(--surface-card)] px-3 pb-[calc(var(--safe-bottom)+5rem)] pt-2">
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex rounded-lg bg-[var(--surface-sunken)] p-0.5">
            {(['saturday', 'sunday'] as DayId[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { setDay(d); setFollowNow(false); }}
                className={cx('rounded px-2 py-1 text-[12px] font-bold', day === d ? 'bg-[var(--chip-on)] text-white' : 'text-secondary')}
              >
                {d === 'saturday' ? 'Sat' : 'Sun'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[13px] font-bold text-primary">
            <Clock size={14} aria-hidden />
            {formatMinutes(atMinute)}
            <span className="ml-1 rounded-full bg-accent-soft px-1.5 text-[10px] font-semibold text-accent">
              Planned from schedule
            </span>
          </div>
          <div className="flex-1" />
          {nowInfo.day && (
            <button
              type="button"
              onClick={() => setFollowNow((v) => !v)}
              className={cx('rounded-full px-2 py-1 text-[11px] font-bold', followNow ? 'bg-warp-ok/15 text-warp-ok' : 'bg-[var(--surface-sunken)] text-secondary')}
            >
              {followNow ? 'Live time' : 'Use now'}
            </button>
          )}
        </div>
        <input
          type="range"
          min={OPEN}
          max={CLOSE}
          step={5}
          value={atMinute}
          onChange={(e) => { setFollowNow(false); setSliderMin(Number(e.target.value)); }}
          aria-label="Time of day"
          aria-valuetext={formatMinutes(atMinute)}
          className="w-full accent-warp-pink"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-muted">
            {myCheckin ? `You checked in ${formatRelative(myCheckin.updatedAt)}` : 'Positions are planned, not live.'}
          </span>
          <Button variant={checkInMode ? 'primary' : 'secondary'} className="px-3 py-1.5" onClick={() => setCheckInMode((v) => !v)}>
            <MapPin size={15} aria-hidden /> Check in
          </Button>
        </div>
      </div>

    </div>
  );
}

function LocationCard({
  loc,
  friendsHere,
  onClose,
  onCheckIn,
  onRecenter,
}: {
  loc: MapLocation;
  friendsHere: { id: string; name: string; initials: string; avatar: string | null; colorKey: string }[];
  onClose: () => void;
  onCheckIn: () => void;
  onRecenter: () => void;
}) {
  return (
    <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl bg-[var(--surface-card)] p-3 shadow-2xl ring-1 ring-black/10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-[15px] text-primary">{loc.name}</div>
          <div className="text-[12px] capitalize text-secondary">
            {loc.amenityType ?? loc.category.replace('-', ' ')}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-muted">
          <X size={18} aria-hidden />
        </button>
      </div>
      {friendsHere.length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-[12px] text-secondary">Planned here:</span>
          {friendsHere.map((u) => (
            <FriendAvatar key={u.id} user={u as never} size={22} />
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" className="flex-1 py-1.5" onClick={onRecenter}>
          <Crosshair size={15} aria-hidden /> Recenter
        </Button>
        <Button variant="yellow" className="flex-1 py-1.5" onClick={onCheckIn}>
          <Check size={15} aria-hidden /> Check in here
        </Button>
      </div>
    </div>
  );
}
