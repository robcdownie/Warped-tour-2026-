import { Calendar, Clock, Star, Users, Flag, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useClock } from '@/hooks/useClock';
import { Screen, Card, Button, cx } from '@/components/ui';
import { FriendAvatar } from '@/components/FriendAvatar';
import { EVENT, ART } from '@/config/event';
import { timeUntilFestival } from '@/domain/time';
import {
  isScheduleLoaded,
  selectedMainByDay,
} from '@/store/selectors';
import type { TabId } from '@/store/appStore';
import type { MenuRoute } from '@/components/MenuDrawer';
import { NowDashboard } from './now/NowDashboard';

export function NowScreen({
  onOpenMenu,
  onGoTab,
}: {
  onOpenMenu: (r: MenuRoute) => void;
  onGoTab: (t: TabId) => void;
}) {
  const performances = useApp((s) => s.performances);
  const scheduleLoaded = isScheduleLoaded(performances);

  if (scheduleLoaded) {
    return <NowDashboard onOpenMenu={onOpenMenu} onGoTab={onGoTab} />;
  }
  return <PreSchedule onOpenMenu={onOpenMenu} onGoTab={onGoTab} />;
}

function PreSchedule({
  onOpenMenu,
  onGoTab,
}: {
  onOpenMenu: (r: MenuRoute) => void;
  onGoTab: (t: TabId) => void;
}) {
  useClock(1000);
  const activeUserId = useApp((s) => s.settings.activeUserId);
  const users = useApp((s) => s.users);
  const selections = useApp((s) => s.selections);
  const performanceById = useApp((s) => s.performanceById);
  const friendImports = useApp((s) => s.settings.friendImports);

  const satCount = selectedMainByDay(selections, performanceById, activeUserId, 'saturday').length;
  const sunCount = selectedMainByDay(selections, performanceById, activeUserId, 'sunday').length;
  const friendsImported = Object.keys(friendImports).length;

  const cd = timeUntilFestival();

  return (
    <Screen>
      {/* Hero banner — generated Long Beach artwork with a legibility scrim */}
      <div className="relative -mx-4 mb-4 overflow-hidden">
        <img
          src={ART.hero}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(8,36,80,0.25) 0%, rgba(8,36,80,0.05) 45%, rgba(5,25,58,0.78) 100%)' }}
        />
        <div className="relative px-5 pb-5 pt-16">
          <div className="font-display text-[30px] leading-none text-white" style={{ textShadow: '2px 2px 0 #0a0f1c' }}>
            WARPED TOUR
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded bg-warp-yellow px-2 py-0.5 font-display text-[13px] text-warp-ink shadow-[1.5px_1.5px_0_#0a0f1c]">
              LONG BEACH
            </span>
            <span className="font-display text-[15px] text-warp-pink" style={{ textShadow: '1.5px 1.5px 0 #0a0f1c' }}>
              2026
            </span>
          </div>
        </div>
      </div>

      {/* Countdown + hours */}
      <Card className="mb-4 overflow-hidden border-warp-yellow/60">
        <div className="grid grid-cols-2 divide-x divide-white/10 bg-warp-ink text-white">
          <div className="p-4">
            <div className="mb-2 flex items-center gap-2 text-warp-pink">
              <Calendar size={16} aria-hidden />
              <span className="text-[12px] font-bold uppercase tracking-wide">Countdown</span>
            </div>
            {cd.ended ? (
              <div className="font-display text-[18px]">See you next time</div>
            ) : cd.started ? (
              <div className="font-display text-[18px] text-warp-yellow">Happening now!</div>
            ) : (
              <div className="flex items-end gap-2">
                <CountUnit n={cd.days} label="days" />
                <CountUnit n={cd.hours} label="hrs" />
                <CountUnit n={cd.minutes} label="min" />
              </div>
            )}
            <div className="mt-2 text-[12px] text-white/70">July 25–26, 2026</div>
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-center gap-2 text-warp-pink">
              <Clock size={16} aria-hidden />
              <span className="text-[12px] font-bold uppercase tracking-wide">Hours</span>
            </div>
            <div className="font-display text-[17px]">11:00 AM – 10:00 PM</div>
            <div className="mt-1 text-[12px] text-white/70">
              Sat Jul 25 &amp; Sun Jul 26
            </div>
            <div className="text-[12px] text-white/70">{EVENT.venue}</div>
          </div>
        </div>
      </Card>

      {/* Plan overview */}
      <Card className="mb-4 p-4">
        <h2 className="mb-3 font-display text-[15px] uppercase tracking-wide text-secondary">
          Your Plan Overview
        </h2>
        <div className="grid grid-cols-4 gap-1 text-center">
          <Stat Icon={Star} iconClass="text-warp-pink" value={satCount} label="Bands Sat" />
          <Stat Icon={Star} iconClass="text-accent" value={sunCount} label="Bands Sun" />
          <Stat Icon={Users} iconClass="text-warp-orange" value={friendsImported} label="Friends" />
          <Stat Icon={Flag} iconClass="text-warp-ok" value={'--'} label="Meetups" />
        </div>
      </Card>

      {/* Next up — honest empty state until set times exist */}
      <Card className="mb-4 p-4">
        <h2 className="mb-3 font-display text-[15px] uppercase tracking-wide text-secondary">
          Next Up
        </h2>
        <button
          type="button"
          onClick={() => onOpenMenu('schedule-io')}
          className="flex w-full items-center gap-3 text-left"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-sunken)] text-muted">
            <Clock size={22} aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block text-[14px] font-semibold text-primary">Nothing scheduled yet</span>
            <span className="block text-[13px] text-muted">
              Your next set shows here once times are loaded.
            </span>
          </span>
          <ChevronRight className="text-muted" aria-hidden />
        </button>
      </Card>

      {/* Friends */}
      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[15px] uppercase tracking-wide text-secondary">
            Friends
          </h2>
          <button
            type="button"
            className="min-h-touch text-[13px] font-semibold text-accent"
            onClick={() => onOpenMenu('friends')}
          >
            Manage
          </button>
        </div>
        <div className="flex items-start justify-around">
          {users.map((u) => {
            const imported = !!friendImports[u.id];
            return (
              <div key={u.id} className="flex flex-col items-center gap-1">
                <FriendAvatar user={u} size={56} dim={!imported} ring />
                <span className="text-[13px] font-semibold text-primary">{u.name}</span>
                <span className={cx('text-[11px]', imported ? 'text-warp-ok' : 'text-muted')}>
                  {imported ? 'Imported' : 'Not imported'}
                </span>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => onOpenMenu('friends')}
            className="flex flex-col items-center gap-1"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[var(--accent-text)] text-accent">
              <Plus size={24} aria-hidden />
            </span>
            <span className="text-[13px] font-semibold text-accent">Import</span>
          </button>
        </div>
      </Card>

      {/* Schedule status */}
      <Card className="mb-2 border-warp-yellow/50 bg-warp-yellow/5 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-warp-yellow-dark text-warp-yellow-dark">
            <Calendar size={22} aria-hidden />
          </span>
          <div className="flex-1">
            <div className="font-display text-[15px] text-primary">Set times not loaded</div>
            <p className="text-[13px] text-secondary">
              Add or import the official stage schedule when it&apos;s released.
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="yellow" onClick={() => onOpenMenu('schedule-io')}>
            Import Set Times
          </Button>
          <Button variant="secondary" onClick={() => onGoTab('schedule')}>
            Enter Manually
          </Button>
        </div>
      </Card>

      <p className="px-1 pt-3 text-center text-[11px] leading-relaxed text-muted">
        Unofficial personal companion app. Not affiliated with or endorsed by Vans or Vans
        Warped Tour.
      </p>
    </Screen>
  );
}

function CountUnit({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-[26px] leading-none text-white tabular-nums">
        {String(n).padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-white/60">{label}</span>
    </div>
  );
}

function Stat({
  Icon,
  iconClass,
  value,
  label,
}: {
  Icon: typeof Star;
  iconClass: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon size={22} className={iconClass} aria-hidden />
      <span className="font-display text-[22px] leading-none text-primary tabular-nums">
        {value}
      </span>
      <span className="text-[11px] leading-tight text-secondary">{label}</span>
    </div>
  );
}
