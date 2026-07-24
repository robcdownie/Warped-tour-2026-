import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { cx } from '@/components/ui';
import { applyScheduleEdit, parseTimeInput } from './scheduleEdit';
import { STAGES } from '@/data/stages';
import type { Performance } from '@/domain/types';
import { formatTime } from '@/domain/time';

/** Inline stage + start/end editor for a single performance. Saves immediately. */
export function PerfRowEditor({
  perf,
  artistName,
  lockStage,
}: {
  perf: Performance;
  artistName: string;
  lockStage?: boolean;
}) {
  const performances = useApp((s) => s.performances);
  const updatePerformance = useApp((s) => s.updatePerformance);
  const [warn, setWarn] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const save = async (patch: Parameters<typeof applyScheduleEdit>[1]) => {
    const res = applyScheduleEdit(perf, patch, performances);
    setWarn(res.warnings);
    setErr(res.error ?? null);
    if (res.error) return;
    await updatePerformance(res.performance, `${artistName}: schedule updated`);
  };

  return (
    <div className="surface-card rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate font-display text-[14px] text-primary">{artistName}</span>
        <StatusDot perf={perf} />
      </div>
      <div className={cx('grid gap-2', lockStage ? 'grid-cols-2' : 'grid-cols-1')}>
        {!lockStage && (
          <label className="block">
            <span className="mb-0.5 block text-[11px] font-semibold text-muted">Stage</span>
            <select
              value={perf.stageId ?? ''}
              onChange={(e) => save({ stageId: e.target.value || null })}
              className="min-h-touch w-full rounded-lg border border-subtle bg-[var(--surface-sunken)] px-2 text-[14px] text-primary outline-none focus:border-warp-blue-400"
            >
              <option value="">— no stage —</option>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName ?? s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <TimeField
            label="Start"
            value={perf.startTime}
            onCommit={(v) => save({ startTime: v })}
          />
          <TimeField
            label="End (optional)"
            value={perf.endTime}
            onCommit={(v) => save({ endTime: v })}
          />
        </div>
      </div>
      {err && (
        <p className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-warp-danger">
          <AlertTriangle size={13} aria-hidden /> {err}
        </p>
      )}
      {warn.map((w, i) => (
        <p key={i} className="mt-1.5 flex items-center gap-1 text-[12px] text-warp-warn">
          <AlertTriangle size={13} aria-hidden /> {w}
        </p>
      ))}
    </div>
  );
}

function TimeField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string | null;
  onCommit: (v: string | null) => void;
}) {
  const [text, setText] = useState(value ? formatTime(value) : '');

  const commit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onCommit(null);
      return;
    }
    const parsed = parseTimeInput(trimmed);
    if (parsed) {
      onCommit(parsed);
      setText(formatTime(parsed));
    } else {
      // revert to last valid
      setText(value ? formatTime(value) : '');
    }
  };

  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-semibold text-muted">{label}</span>
      <input
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder="3:05 PM"
        className="min-h-touch w-full rounded-lg border border-subtle bg-[var(--surface-sunken)] px-2 text-[14px] text-primary outline-none focus:border-warp-blue-400"
      />
    </label>
  );
}

function StatusDot({ perf }: { perf: Performance }) {
  const scheduled = perf.startTime && perf.stageId;
  return (
    <span
      className={cx(
        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
        scheduled ? 'bg-warp-ok/15 text-warp-ok' : 'bg-[var(--surface-sunken)] text-muted',
      )}
    >
      {scheduled ? 'Set' : 'Pending'}
    </span>
  );
}
