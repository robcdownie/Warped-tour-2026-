import { Screen } from '@/components/ui';
import type { TabId } from '@/store/appStore';
import type { MenuRoute } from '@/components/MenuDrawer';

// Full festival dashboard (populated once set times exist). Built out in Phase 5.
export function NowDashboard({
  onOpenMenu: _onOpenMenu,
  onGoTab: _onGoTab,
}: {
  onOpenMenu: (r: MenuRoute) => void;
  onGoTab: (t: TabId) => void;
}) {
  return (
    <Screen>
      <div className="py-10 text-center text-secondary">Dashboard loading…</div>
    </Screen>
  );
}
