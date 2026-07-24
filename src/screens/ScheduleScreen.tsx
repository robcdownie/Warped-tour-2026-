import { CalendarDays } from 'lucide-react';
import { Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import type { MenuRoute } from '@/components/MenuDrawer';

export function ScheduleScreen({ onOpenMenu: _onOpenMenu }: { onOpenMenu: (r: MenuRoute) => void }) {
  return (
    <Screen>
      <EmptyState Icon={CalendarDays} title="Schedule" message="Coming up in the build." />
    </Screen>
  );
}
