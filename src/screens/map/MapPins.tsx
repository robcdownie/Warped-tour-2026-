import type { MapLocation, User } from '@/domain/types';
import { MapMarker } from './MapCanvas';
import { FriendAvatar } from '@/components/FriendAvatar';
import { CATEGORY_STYLE, amenityColor } from './markerMeta';
import type { PlannedPosition } from '@/domain/positions';

/** Stage/location pin: colored teardrop with an optional short label. */
export function LocationPin({
  loc,
  labeled,
  highlighted,
  onClick,
}: {
  loc: MapLocation;
  labeled?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
}) {
  const color = loc.category === 'amenity' ? amenityColor(loc.amenityType) : CATEGORY_STYLE[loc.category].color;
  const isStage = loc.category === 'stage';
  return (
    <MapMarker xPercent={loc.xPercent} yPercent={loc.yPercent} onClick={onClick} z={isStage ? 3 : 2}>
      <div className="flex flex-col items-center">
        {labeled && isStage && (
          <span
            className="mb-0.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
            style={{ background: color }}
          >
            {loc.shortName ?? loc.name}
          </span>
        )}
        <span
          className="flex items-center justify-center rounded-full border-2 border-white shadow-md"
          style={{
            width: isStage ? 18 : 14,
            height: isStage ? 18 : 14,
            background: color,
            outline: highlighted ? '3px solid #ffd21e' : undefined,
          }}
        >
          {isStage && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
      </div>
    </MapMarker>
  );
}

/** Friend marker showing a planned/checked-in position. */
export function FriendPin({
  user,
  position,
  loc,
  onClick,
}: {
  user: User;
  position: PlannedPosition;
  loc?: MapLocation;
  onClick?: () => void;
}) {
  if (!loc) return null;
  const traveling = position.kind === 'traveling';
  const stale = position.source === 'stale';
  return (
    <MapMarker xPercent={loc.xPercent} yPercent={loc.yPercent} onClick={onClick} anchor="bottom" z={5}>
      <div className="flex flex-col items-center" style={{ opacity: stale ? 0.6 : 1 }}>
        <div className="relative">
          <FriendAvatar user={user} size={30} ring />
          {traveling && (
            <span className="absolute -right-1 -top-1 rounded-full bg-warp-yellow px-1 text-[8px] font-bold text-warp-ink shadow">
              →
            </span>
          )}
          {position.source === 'manual' && (
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-warp-ok" aria-hidden />
          )}
        </div>
        <span
          className="mt-0.5 h-0 w-0"
          style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid #fff' }}
          aria-hidden
        />
      </div>
    </MapMarker>
  );
}
