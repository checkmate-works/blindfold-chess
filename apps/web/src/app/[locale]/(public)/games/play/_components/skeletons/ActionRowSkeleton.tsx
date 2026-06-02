import { ACTION_ROW_CONTAINER_CLASSES } from '../../_lib/skeleton-layout-classes';
import { ActionButtonSkeleton } from './ActionButtonSkeleton';

/**
 * Skeleton for the action button row rendered by `GameInProgressPanel`:
 * Undo + Resign. Outer layout is shared with the real panel via
 * `ACTION_ROW_CONTAINER_CLASSES` so the swap introduces no CLS even if the
 * row's flex/gap classes are tweaked later. (The modal "Show Board" peek
 * button was removed with the always-present-board model.)
 */
export function ActionRowSkeleton() {
  return (
    <div aria-hidden className={ACTION_ROW_CONTAINER_CLASSES}>
      <ActionButtonSkeleton />
      <ActionButtonSkeleton />
    </div>
  );
}
