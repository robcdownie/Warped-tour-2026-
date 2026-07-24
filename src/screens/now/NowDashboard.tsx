import { useMemo } from 'react';
import { Clock, MapPin, Footprints, ChevronRight, Users, AlertTriangle, Handshake, CalendarClock } from 'lucide-react';
import { Screen, Card, Button, cx } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { FriendAvatar } from '@/components/FriendAvatar';
import { MeetupCard } from '@/components/MeetupCard';
import { useApp } from '@/store/appStore';
import { useClock } from '@/hooks/useClock';
import { useGroupCtx } from '@/hooks/useGroupCtx';
import { useConflicts } from '@/hooks/useConflicts';
import { useMeetups } from '@/hooks/useMeetups';
import { getNow, formatTime, formatMinutes, formatDuration, hhmmToMinutes, dayLabel } from '@/domain/time';
import { withEffectiveEnds } from '@/domain/endTimes';
import { travelMinutes, overrideMap } from '@/domain/travel';
import { plannedPosition } from '@/domain/positions';
import type { TabId } from '@/store/appStore';
import type { MenuRoute } from '@/components/MenuDrawer';
import type { DayId, Performance } from '@/domain/types';

export function NowDashboard({
  onOpenMenu,
  onGoTab,
}: {
  onOpenMenu: (r: MenuRoute) => void;
  onGoTab: (t: TabId) => void;
}) {
  const now = useClock(15000);
  const nowInfo = getNow(now);
  const activeUserId = useApp((s) => s.settings.activeUserId);
  const selections = useApp((s) => s.selections);
  const performanceById = useApp((s) => s.performanceById);
  const performances = useApp((s) => s.performances);
  const artistById = useApp((s) => s.artistById);
  const locationById = useApp((s) => s.locationById);
  const users = useApp((s) => s.users);
  const crowd = useApp((s) => s.settings.crowdDelay);
  const turnoverBuffer = useApp((s) => s.settings.turnoverBuffer);
  const overridesArr = useApp((s) => s.travelOverrides);
  const ctx = useGroupCtx();

  // If not currently a festival day, use Saturday as the reference for planning.
  const day: DayId = nowInfo.day ?? 'saturday';
  const nowMinute = nowInfo.day ? nowInfo.minutes : 12 * 60;

  const ends = useMemo(() => withEffectiveEnds(performances, turnoverBuffer), [performances, turnoverBuffer]);
  const omap = useMemo(() => overrideMap(overridesArr), [overridesArr]);
  const conflicts = useConflicts(activeUserId);
  const meetups = useMeetups(day, 3);

  // Current or next selected performance for the active user.
  const myStops = useMemo(() => {
    return selections
      .filter((s) => {
        if (s.userId !== activeUserId || !s.selected || s.attendanceDecision === 'skipping') return false;
        const p = performanceById.get(s.performanceId);
        return p?.day === day && p.type === 'main' && p.startTime && p.stageId;
      })
      .map((s) => performanceById.get(s.performanceId)!)
      .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1));
  }, [selections, activeUserId, performanceById, day]);

  const { current, next, previous } = useMemo(() => {
    let current: Performance | undefined;
    let next: Performance | undefined;
    let previous: Performance | undefined;
    for (const p of myStops) {
      const start = hhmmToMinutes(p.startTime!);
      const end = ends.get(p.id)?.minutes ?? start + 30;
      if (nowMinute >= start && nowMinute < end) current = p;
      else if (start > nowMinute && !next) next = p;
      else if (end <= nowMinute) previous = p;
    }
    return { current, next, previous };
  }, [myStops, ends, nowMinute]);

  const focus = current ?? next;
  const upcomingConflicts = conflicts.filter((c) => c.severity !== 'info').slice(0, 3);

  return (
    <Screen>
      {/* Header strip */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[22px] text-primary">
            {nowInfo.day ? dayLabel(nowInfo.day) : 'Festival plan'}
          </h1>
          <p className="text-[13px] text-secondary">
            {nowInfo.day ? `It's ${formatMinutes(nowInfo.minutes)}` : 'Planning view'}
          </p>
        </div>
        {!nowInfo.day && (
          <button
            type="button"
            onClick={() => onGoTab('schedule')}
            className="rounded-full bg-warp-blue-500/10 px-3 py-1.5 text-[12px] font-semibold text-warp-blue-500"
          >
            Preview {dayLabel(day)}
          </button>
        )}
      </div>

      {/* NEXT UP / NOW */}
      {focus ? (
        <NextUpCard
          performance={focus}
          isNow={!!current}
          artistName={artistById.get(focus.artistId)?.name ?? 'Artist'}
          stageName={focus.stageId ? locationById.get(focus.stageId)?.name : undefined}
          minutesUntil={hhmmToMinutes(focus.startTime!) - nowMinute}
          travel={
            previous?.stageId && focus.stageId && previous.stageId !== focus.stageId
              ? travelMinutes(locationById.get(previous.stageId), locationById.get(focus.stageId), crowd, omap).minutes
              : undefined
          }
          friends={selections
            .filter((s) => s.performanceId === focus.id && s.selected && s.userId !== activeUserId)
            .map((s) => users.find((u) => u.id === s.userId))
            .filter((u): u is NonNullable<typeof u> => !!u)}
          onOpen={() => onGoTab('schedule')}
        />
      ) : (
        <Card className="mb-4 p-4">
          <EmptyState
            Icon={CalendarClock}
            title={myStops.length ? 'All done for now' : 'No sets lined up'}
            message={myStops.length ? 'No more sets on your plan for this day.' : 'Pick bands and add set times to see your next set here.'}
            action={<Button variant="secondary" className="mt-1" onClick={() => onGoTab('bands')}>Pick bands</Button>}
          />
        </Card>
      )}

      {/* Where friends plan to be now */}
      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-display text-[15px] uppercase tracking-wide text-secondary">
            <Users size={15} aria-hidden /> The crew right now
          </h2>
          <button type="button" onClick={() => onGoTab('map')} className="text-[13px] font-semibold text-warp-blue-500">
            Map
          </button>
        </div>
        <div className="space-y-2">
          {users.map((u) => {
            const pos = plannedPosition(u.id, day, nowMinute, {
              selections: ctx.selections,
              performanceById: ctx.performanceById,
              locationById: ctx.locationById,
              allPerformances: ctx.allPerformances,
              crowd: ctx.crowd,
              turnoverBuffer: ctx.turnoverBuffer,
              overrides: ctx.overrides,
            });
            return (
              <div key={u.id} className="flex items-center gap-2.5">
                <FriendAvatar user={u} size={30} ring />
                <span className="text-[14px] font-semibold text-primary">{u.name}</span>
                <span className="flex-1 truncate text-[13px] text-secondary">{pos.label}</span>
                {pos.kind === 'open' && (
                  <span className="rounded-full bg-warp-ok/15 px-2 py-0.5 text-[11px] font-semibold text-warp-ok">free</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted">Planned from everyone&apos;s schedule — not live GPS.</p>
      </Card>

      {/* Best meetup */}
      {meetups.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 flex items-center gap-1.5 font-display text-[15px] uppercase tracking-wide text-secondary">
            <Handshake size={15} aria-hidden /> Next meetup
          </h2>
          <MeetupCard meetup={meetups[0]} highlight />
        </div>
      )}

      {/* Conflicts */}
      {upcomingConflicts.length > 0 && (
        <Card className="mb-4 border-warp-warn/40 p-4">
          <h2 className="mb-2 flex items-center gap-1.5 font-display text-[15px] uppercase tracking-wide text-warp-warn">
            <AlertTriangle size={15} aria-hidden /> Heads up
          </h2>
          <ul className="space-y-1.5">
            {upcomingConflicts.map((c) => (
              <li key={c.id} className="text-[13px] text-secondary">
                <b className="text-primary">{c.title}.</b> {c.message}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onGoTab('schedule')} className="mt-2 text-[13px] font-semibold text-warp-blue-500">
            Resolve in Schedule →
          </button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => onOpenMenu('emergency')}>
          Emergency plan
        </Button>
        <Button variant="secondary" onClick={() => onGoTab('group')}>
          Group day
        </Button>
      </div>
    </Screen>
  );
}

function NextUpCard({
  performance,
  isNow,
  artistName,
  stageName,
  minutesUntil,
  travel,
  friends,
  onOpen,
}: {
  performance: Performance;
  isNow: boolean;
  artistName: string;
  stageName?: string;
  minutesUntil: number;
  travel?: number;
  friends: { id: string; name: string; initials: string; avatar: string | null; colorKey: string }[];
  onOpen: () => void;
}) {
  return (
    <button type="button" onClick={onOpen} className="mb-4 block w-full text-left">
      <Card className={cx('overflow-hidden p-0', isNow ? 'border-warp-pink/50' : 'border-warp-blue-500/40')}>
        <div className={cx('px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white', isNow ? 'bg-warp-pink' : 'bg-warp-blue-500')}>
          {isNow ? 'On now' : 'Next up'}
        </div>
        <div className="flex items-center gap-3 p-4">
          <div className="text-center">
            <div className="font-display text-[20px] leading-none text-primary">{formatTime(performance.startTime)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[18px] text-primary">{artistName}</div>
            <div className="flex items-center gap-1 text-[14px] text-secondary">
              <MapPin size={14} aria-hidden /> {stageName ?? 'Stage TBA'}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
              {!isNow && minutesUntil > 0 && (
                <span className="flex items-center gap-1 font-semibold text-warp-pink">
                  <Clock size={13} aria-hidden /> in {formatDuration(minutesUntil)}
                </span>
              )}
              {travel != null && (
                <span className="flex items-center gap-1 text-muted">
                  <Footprints size={13} aria-hidden /> ~{formatDuration(travel)} walk
                </span>
              )}
              {friends.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="flex -space-x-1.5">
                    {friends.slice(0, 3).map((f) => (
                      <FriendAvatar key={f.id} user={f as never} size={18} className="ring-2 ring-[var(--surface-card)]" />
                    ))}
                  </span>
                  <span className="text-muted">also going</span>
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="text-muted" aria-hidden />
        </div>
      </Card>
    </button>
  );
}
