import { useMemo, useState } from 'react';
import { Users, MapPin, CalendarClock, Coffee, AlertTriangle, Star, Handshake } from 'lucide-react';
import { Screen, Card, cx } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { FriendAvatar } from '@/components/FriendAvatar';
import { useApp } from '@/store/appStore';
import { useGroupCtx } from '@/hooks/useGroupCtx';
import { useConflicts } from '@/hooks/useConflicts';
import { groupTimeline, sharedSets, freeWindows, type GroupSlot } from '@/domain/group';
import { MeetupCard } from '@/components/MeetupCard';
import { useMeetups } from '@/hooks/useMeetups';
import { itinerary } from '@/store/selectors';
import { isScheduleLoaded } from '@/store/selectors';
import { formatMinutes, formatTime, formatDuration, hhmmToMinutes } from '@/domain/time';
import { EVENT, ART } from '@/config/event';
import type { DayId, User } from '@/domain/types';
import type { TabId } from '@/store/appStore';

type ViewMode = 'timeline' | 'person' | 'shared' | 'meetups' | 'conflicts' | 'free';

const VIEWS: { id: ViewMode; label: string; Icon: typeof Users }[] = [
  { id: 'timeline', label: 'Timeline', Icon: CalendarClock },
  { id: 'person', label: 'By Person', Icon: Users },
  { id: 'shared', label: 'Shared', Icon: Star },
  { id: 'meetups', label: 'Meetups', Icon: Handshake },
  { id: 'conflicts', label: 'Conflicts', Icon: AlertTriangle },
  { id: 'free', label: 'Free Time', Icon: Coffee },
];

export function GroupScreen({ onGoTab }: { onGoTab: (t: TabId) => void }) {
  const performances = useApp((s) => s.performances);
  const [day, setDay] = useState<DayId>('saturday');
  const [view, setView] = useState<ViewMode>('timeline');
  const scheduleLoaded = isScheduleLoaded(performances);

  return (
    <Screen>
      <h1 className="mb-3 font-display text-[22px] text-primary">Group</h1>

      {/* Day toggle */}
      <div className="mb-3 flex rounded-xl bg-[var(--surface-sunken)] p-0.5">
        {(['saturday', 'sunday'] as DayId[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            className={cx(
              'min-h-touch flex-1 rounded-lg text-[14px] font-semibold transition',
              day === d ? 'bg-[var(--chip-on)] text-white shadow-sm' : 'text-secondary',
            )}
          >
            {d === 'saturday' ? 'Saturday' : 'Sunday'}
          </button>
        ))}
      </div>

      {/* View chips */}
      <div className="no-scrollbar scroll-fade-x -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4">
        {VIEWS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={(e) => {
              setView(id);
              e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
            }}
            aria-pressed={view === id}
            className={cx(
              'inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-[13px] font-semibold',
              view === id ? 'border-[var(--chip-on-border)] bg-[var(--chip-on)] text-white' : 'border-subtle bg-[var(--surface-card)] text-secondary',
            )}
          >
            <Icon size={14} aria-hidden /> {label}
          </button>
        ))}
      </div>

      {!scheduleLoaded && view !== 'person' ? (
        <EmptyState
          Icon={CalendarClock}
          image={ART.emptyGroup}
          title="Set times needed"
          message="Once set times are entered, the group timeline, shared sets, and meetups fill in here."
          action={
            <button
              type="button"
              onClick={() => onGoTab('schedule')}
              className="mt-1 rounded-xl bg-warp-yellow px-4 py-2 text-[14px] font-bold text-warp-ink"
            >
              Go to Schedule
            </button>
          }
        />
      ) : (
        <>
          {view === 'timeline' && <TimelineView day={day} />}
          {view === 'person' && <PersonView day={day} />}
          {view === 'shared' && <SharedView day={day} />}
          {view === 'meetups' && <MeetupsView day={day} />}
          {view === 'conflicts' && <ConflictsView day={day} />}
          {view === 'free' && <FreeView day={day} />}
        </>
      )}
    </Screen>
  );
}

function AttendeeAvatars({ slot, users }: { slot: GroupSlot; users: User[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {slot.attendees.map((a) => {
        const u = users.find((x) => x.id === a.userId);
        if (!u) return null;
        return (
          <span key={a.userId} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-sunken)] px-1.5 py-0.5">
            <FriendAvatar user={u} size={18} dim={a.decision === 'undecided'} />
            <span className="text-[11px] font-semibold text-primary">{u.name}</span>
            {a.decision === 'undecided' && <span className="text-[10px] text-warp-warn">?</span>}
          </span>
        );
      })}
    </div>
  );
}

function TimelineView({ day }: { day: DayId }) {
  const ctx = useGroupCtx();
  const artistById = useApp((s) => s.artistById);
  const slots = useMemo(() => groupTimeline(day, ctx), [day, ctx]);
  if (!slots.length) return <EmptyState Icon={CalendarClock} title="Nothing planned yet" message="No one has a scheduled set this day." />;
  return (
    <div className="space-y-2">
      {slots.map((slot) => (
        <Card key={slot.performance.id} className="p-3">
          <div className="flex items-start gap-3">
            <div className="w-14 shrink-0 text-center">
              <div className="font-display text-[14px] text-primary">{formatMinutes(slot.startMinute)}</div>
              <div className="text-[10px] text-muted">{formatMinutes(slot.endMinute)}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[15px] text-primary">
                {artistById.get(slot.performance.artistId)?.name ?? 'Artist'}
              </div>
              <div className="mb-1.5 flex items-center gap-1 text-[13px] text-secondary">
                <MapPin size={13} aria-hidden />
                {slot.stage?.name ?? 'Stage TBA'}
              </div>
              <AttendeeAvatars slot={slot} users={ctx.users} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PersonView({ day }: { day: DayId }) {
  const ctx = useGroupCtx();
  const artistById = useApp((s) => s.artistById);
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {ctx.users.map((u) => {
        const stops = itinerary(ctx.selections, ctx.performanceById, u.id, day).filter(
          (p) => p.type === 'main',
        );
        return (
          <div key={u.id} className="w-[70%] max-w-[240px] shrink-0">
            <div className="mb-2 flex items-center gap-2">
              <FriendAvatar user={u} size={28} ring />
              <span className="font-display text-[14px] text-primary">{u.name}</span>
              <span className="text-[12px] text-muted">{stops.length}</span>
            </div>
            {stops.length ? (
              <div className="space-y-2">
                {stops.map((p) => (
                  <div key={p.id} className="surface-card rounded-xl p-2.5">
                    <div className="font-display text-[13px] text-primary">{formatTime(p.startTime)}</div>
                    <div className="truncate text-[13px] text-secondary">{artistById.get(p.artistId)?.name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted">
                      <MapPin size={11} aria-hidden />
                      {ctx.locationById.get(p.stageId ?? '')?.shortName ?? 'TBA'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-subtle p-3 text-center text-[12px] text-muted">
                No scheduled sets
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SharedView({ day }: { day: DayId }) {
  const ctx = useGroupCtx();
  const artistById = useApp((s) => s.artistById);
  const shared = useMemo(() => sharedSets(day, ctx), [day, ctx]);
  if (!shared.length)
    return <EmptyState Icon={Star} title="No shared sets yet" message="When two or more of you pick the same set, it shows here." />;
  return (
    <div className="space-y-2">
      {shared.map((slot) => (
        <Card key={slot.performance.id} className="border-warp-pink/30 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-[15px] text-primary">{artistById.get(slot.performance.artistId)?.name}</div>
              <div className="flex items-center gap-1 text-[13px] text-secondary">
                <MapPin size={13} aria-hidden /> {slot.stage?.name ?? 'TBA'} · {formatMinutes(slot.startMinute)}
              </div>
            </div>
            <span className="rounded-full bg-warp-pink/15 px-2 py-1 text-[12px] font-bold text-warp-pink">
              {slot.attendees.length} picked this
            </span>
          </div>
          <div className="mt-2">
            <AttendeeAvatars slot={slot} users={ctx.users} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function MeetupsView({ day }: { day: DayId }) {
  const meetups = useMeetups(day);
  if (!meetups.length)
    return (
      <EmptyState
        Icon={Handshake}
        image={ART.emptyMap}
        title="No meetups found yet"
        message="Once a couple of you have set times entered, the app finds windows where you're all free and picks an easy spot."
      />
    );
  return (
    <div className="space-y-2">
      {meetups.map((m, i) => (
        <MeetupCard key={m.id} meetup={m} highlight={i === 0} />
      ))}
    </div>
  );
}

function ConflictsView({ day }: { day: DayId }) {
  const ctx = useGroupCtx();
  const robbie = useConflicts('robbie').filter((c) => onDay(ctx, c.performanceIds[0], day));
  const ari = useConflicts('ari').filter((c) => onDay(ctx, c.performanceIds[0], day));
  const morgan = useConflicts('morgan').filter((c) => onDay(ctx, c.performanceIds[0], day));
  const byUser: [string, typeof robbie][] = [
    ['robbie', robbie],
    ['ari', ari],
    ['morgan', morgan],
  ];
  const anyConflicts = robbie.length + ari.length + morgan.length > 0;
  if (!anyConflicts)
    return <EmptyState Icon={AlertTriangle} title="No conflicts" message="No one has a clash on their plan this day." />;
  return (
    <div className="space-y-3">
      {byUser.map(([uid, list]) => {
        const u = ctx.users.find((x) => x.id === uid);
        if (!u || !list.length) return null;
        return (
          <Card key={uid} className="p-3">
            <div className="mb-2 flex items-center gap-2">
              <FriendAvatar user={u} size={24} ring />
              <span className="font-display text-[14px] text-primary">{u.name}</span>
              <span className="rounded-full bg-warp-pink px-1.5 text-[11px] font-bold text-white">{list.length}</span>
            </div>
            <ul className="space-y-1">
              {list.map((c) => (
                <li key={c.id} className="flex items-start gap-1.5 text-[13px] text-secondary">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warp-warn" aria-hidden />
                  <span><b>{c.title}.</b> {c.message}</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function onDay(ctx: ReturnType<typeof useGroupCtx>, perfId: string, day: DayId): boolean {
  return ctx.performanceById.get(perfId)?.day === day;
}

function FreeView({ day }: { day: DayId }) {
  const ctx = useGroupCtx();
  const open = hhmmToMinutes(EVENT.festivalHours.opens);
  const close = hhmmToMinutes(EVENT.festivalHours.closes);
  const windows = useMemo(() => freeWindows(day, ctx, { open, close }), [day, ctx, open, close]);
  const byUser = ctx.users.map((u) => ({
    user: u,
    windows: windows.filter((w) => w.userId === u.id && w.endMinute - w.startMinute >= 15),
  }));
  return (
    <div className="space-y-3">
      {byUser.map(({ user, windows: ws }) => (
        <Card key={user.id} className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <FriendAvatar user={user} size={24} ring />
            <span className="font-display text-[14px] text-primary">{user.name}</span>
          </div>
          {ws.length ? (
            <div className="flex flex-wrap gap-1.5">
              {ws.map((w, i) => (
                <span key={i} className="rounded-lg bg-warp-ok/10 px-2 py-1 text-[12px] font-semibold text-warp-ok">
                  {formatMinutes(w.startMinute)}–{formatMinutes(w.endMinute)}
                  <span className="ml-1 text-[10px] opacity-70">({formatDuration(w.endMinute - w.startMinute)})</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted">Packed day — no free windows over 15 min.</p>
          )}
        </Card>
      ))}
    </div>
  );
}
