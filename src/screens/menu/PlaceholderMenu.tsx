import { Wrench } from 'lucide-react';
import { Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import type { MenuRoute } from '@/components/MenuDrawer';
import type { TabId } from '@/store/appStore';

export function PlaceholderMenu({
  route,
  onGoTab: _onGoTab,
}: {
  route: MenuRoute;
  onGoTab: (t: TabId) => void;
}) {
  return (
    <Screen>
      <EmptyState
        Icon={Wrench}
        title="Under construction"
        message={`The "${route}" tools are being built in a later phase of this build.`}
      />
    </Screen>
  );
}
