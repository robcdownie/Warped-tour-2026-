import { ArrowLeft } from 'lucide-react';
import type { MenuRoute } from '@/components/MenuDrawer';
import type { TabId } from '@/store/appStore';
import { OfflineTestScreen } from './OfflineTestScreen';
import { AboutScreen } from './AboutScreen';
import { PlaceholderMenu } from './PlaceholderMenu';

const TITLES: Record<MenuRoute, string> = {
  settings: 'Settings',
  friends: 'Friends & Sharing',
  share: 'Share',
  'schedule-io': 'Schedule Import / Export',
  data: 'Backup & Data',
  'offline-test': 'Offline Test',
  demo: 'Demo Mode',
  about: 'About',
  calibration: 'Map Calibration',
  travel: 'Travel & Crowd',
  emergency: 'Emergency Schedule',
};

export function MenuScreen({
  route,
  onBack,
  onGoTab,
}: {
  route: MenuRoute;
  onBack: () => void;
  onGoTab: (t: TabId) => void;
}) {
  return (
    <div>
      <div
        className="sticky top-0 z-20 flex items-center gap-2 px-2 py-2 pt-[calc(env(safe-area-inset-top)+0.25rem)]"
        style={{ background: 'var(--surface-app)' }}
      >
        <button
          type="button"
          onClick={onBack}
          className="min-h-touch min-w-touch flex items-center justify-center rounded-xl text-primary active:bg-black/5"
          aria-label="Back"
        >
          <ArrowLeft size={22} aria-hidden />
        </button>
        <h1 className="font-display text-[17px] text-primary">{TITLES[route]}</h1>
      </div>
      <RouteBody route={route} onGoTab={onGoTab} />
    </div>
  );
}

function RouteBody({ route, onGoTab }: { route: MenuRoute; onGoTab: (t: TabId) => void }) {
  switch (route) {
    case 'offline-test':
      return <OfflineTestScreen />;
    case 'about':
      return <AboutScreen />;
    default:
      return <PlaceholderMenu route={route} onGoTab={onGoTab} />;
  }
}
