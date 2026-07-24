import { Users } from 'lucide-react';
import { Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import type { TabId } from '@/store/appStore';

export function GroupScreen({ onGoTab: _onGoTab }: { onGoTab: (t: TabId) => void }) {
  return (
    <Screen>
      <EmptyState Icon={Users} title="Group schedule" message="Coming up in the build." />
    </Screen>
  );
}
