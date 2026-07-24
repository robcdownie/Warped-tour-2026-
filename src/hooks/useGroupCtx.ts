import { useApp } from '@/store/appStore';
import type { GroupCtx } from '@/domain/group';

/** Assembles the GroupCtx from the store for the Group screen + map. */
export function useGroupCtx(): GroupCtx {
  const users = useApp((s) => s.users);
  const selections = useApp((s) => s.selections);
  const performanceById = useApp((s) => s.performanceById);
  const locationById = useApp((s) => s.locationById);
  const allPerformances = useApp((s) => s.performances);
  const crowd = useApp((s) => s.settings.crowdDelay);
  const turnoverBuffer = useApp((s) => s.settings.turnoverBuffer);
  const overrides = useApp((s) => s.travelOverrides);
  return {
    users,
    selections,
    performanceById,
    locationById,
    allPerformances,
    crowd,
    turnoverBuffer,
    overrides,
  };
}
