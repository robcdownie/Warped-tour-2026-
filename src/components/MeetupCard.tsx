import { MapPin, Clock, ArrowRight, LogOut, Users } from 'lucide-react';
import { Card, cx } from './ui';
import { FriendAvatar } from './FriendAvatar';
import { useApp } from '@/store/appStore';
import { formatMinutes, formatDuration } from '@/domain/time';
import type { MeetupSuggestion } from '@/domain/meetups';

const CONFIDENCE_META = {
  high: { label: 'Great fit', color: 'var(--ok-text)' },
  medium: { label: 'Workable', color: 'var(--warn-text)' },
  low: { label: 'Tight', color: 'var(--color-warp-orange)' },
} as const;

export function MeetupCard({ meetup, highlight }: { meetup: MeetupSuggestion; highlight?: boolean }) {
  const users = useApp((s) => s.users);
  const locationById = useApp((s) => s.locationById);
  const conf = CONFIDENCE_META[meetup.confidence];

  const stageName = (id?: string) => (id ? locationById.get(id)?.shortName ?? locationById.get(id)?.name : undefined);

  return (
    <Card className={cx('p-4', highlight && 'border-warp-pink/50 ring-1 ring-warp-pink/30')}>
      {highlight && (
        <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-warp-pink">
          <Users size={12} aria-hidden /> Best meetup
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 font-display text-[17px] text-primary">
            <Clock size={16} className="text-warp-pink" aria-hidden />
            {formatMinutes(meetup.startMinute)} – {formatMinutes(meetup.endMinute)}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[14px] text-secondary">
            <MapPin size={14} className="shrink-0" aria-hidden />
            <span className="font-semibold text-primary">{meetup.location.name}</span>
            {/* Parenthesized + nowrap: reads fine inline AND when a long
                location name pushes it to its own line (a leading "·" there
                looked like a typo). */}
            <span className="whitespace-nowrap text-muted">({formatDuration(meetup.durationMinutes)})</span>
          </div>
        </div>
        <span
          className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{
            background: `color-mix(in srgb, ${conf.color} 14%, transparent)`,
            color: conf.color,
          }}
        >
          {conf.label}
        </span>
      </div>

      {/* Who */}
      <div className="mt-3 flex items-center gap-1.5">
        {meetup.userIds.map((uid) => {
          const u = users.find((x) => x.id === uid);
          if (!u) return null;
          return (
            <span key={uid} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-sunken)] px-2 py-1">
              <FriendAvatar user={u} size={20} />
              <span className="text-[12px] font-semibold text-primary">{u.name}</span>
            </span>
          );
        })}
        {meetup.userIds.length === 3 && (
          <span className="text-[12px] font-semibold text-warp-ok">All three free</span>
        )}
      </div>

      {/* Why */}
      <p className="mt-2 text-[13px] leading-relaxed text-secondary">{meetup.reason}</p>

      {/* Per-person leave-by */}
      <div className="mt-3 space-y-1 border-t border-subtle pt-2">
        {meetup.perUser.map((pu) => {
          const u = users.find((x) => x.id === pu.userId);
          if (!u) return null;
          return (
            <div key={pu.userId} className="flex items-center gap-2 text-[12px]">
              <FriendAvatar user={u} size={18} />
              <span className="font-semibold text-primary">{u.name}</span>
              {pu.openAfter ? (
                <span className="text-warp-ok">open time after — no rush</span>
              ) : (
                <span className="flex items-center gap-1 text-secondary">
                  <LogOut size={12} aria-hidden />
                  leave by <b className="text-primary">{formatMinutes(pu.leaveByMinute!)}</b>
                  <ArrowRight size={11} aria-hidden />
                  {stageName(pu.nextStageId) ?? 'next set'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {meetup.usesEstimated && (
        <p className="mt-2 text-[11px] font-semibold text-warp-warn">Based partly on estimated set end times.</p>
      )}
    </Card>
  );
}
