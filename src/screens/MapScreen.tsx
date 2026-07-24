import { MapPin } from 'lucide-react';
import { Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import type { MenuRoute } from '@/components/MenuDrawer';

export function MapScreen({ onOpenMenu: _onOpenMenu }: { onOpenMenu: (r: MenuRoute) => void }) {
  return (
    <Screen>
      <EmptyState Icon={MapPin} title="Festival map" message="Coming up in the build." />
    </Screen>
  );
}
