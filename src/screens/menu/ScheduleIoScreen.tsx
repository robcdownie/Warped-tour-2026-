import { useMemo, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { Screen, Card, cx } from '@/components/ui';
import { ExportPanel } from '@/components/ExportPanel';
import { ImportPanel } from '@/components/ImportPanel';
import { useApp } from '@/store/appStore';
import { encodeSchedule } from '@/domain/share/payloads';
import { timestampSlug } from '@/domain/share/files';
import { scheduleCompletion } from '@/store/selectors';

export function ScheduleIoScreen() {
  const performances = useApp((s) => s.performances);
  const activeUserId = useApp((s) => s.settings.activeUserId);
  const [tab, setTab] = useState<'export' | 'import'>('import');

  const completion = useMemo(() => scheduleCompletion(performances), [performances]);
  const code = useMemo(
    () => encodeSchedule(performances, activeUserId, new Date().toISOString()),
    [performances, activeUserId],
  );
  const scheduledCount = performances.filter((p) => p.startTime && p.stageId).length;

  return (
    <Screen>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface-sunken)] p-1">
        <Tab active={tab === 'import'} onClick={() => setTab('import')}>
          <Download size={15} aria-hidden /> Import
        </Tab>
        <Tab active={tab === 'export'} onClick={() => setTab('export')}>
          <Upload size={15} aria-hidden /> Export
        </Tab>
      </div>

      {tab === 'import' ? (
        <>
          <Card className="mb-4 border-warp-blue-500/30 bg-warp-blue-500/5 p-3">
            <p className="text-[13px] leading-relaxed text-secondary">
              Got the official set times as a Warped code from a friend or your other device? Scan,
              paste, or load the file. You&apos;ll see exactly what changes before anything is saved.
            </p>
          </Card>
          <ImportPanel accept={['schedule']} />
        </>
      ) : (
        <>
          <Card className="mb-4 p-3">
            <p className="text-[13px] text-secondary">
              Share the set times you&apos;ve entered so far. {scheduledCount} performances have a stage
              and start time ({completion.percent}% complete). The code contains the actual data, so it
              works with no signal.
            </p>
          </Card>
          <ExportPanel
            code={code}
            filename={`warped-schedule-${timestampSlug()}.json`}
            hint="Your friend imports this on the Schedule Import screen."
          />
        </>
      )}
    </Screen>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'min-h-touch flex items-center justify-center gap-1 rounded-lg text-[14px] font-semibold transition',
        active ? 'bg-warp-blue-500 text-white shadow-sm' : 'text-secondary',
      )}
    >
      {children}
    </button>
  );
}
