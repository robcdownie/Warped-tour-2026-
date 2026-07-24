import { Star } from 'lucide-react';
import { Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';

export function BandsScreen() {
  return (
    <Screen>
      <EmptyState Icon={Star} title="Band selector" message="Coming up next in the build." />
    </Screen>
  );
}
