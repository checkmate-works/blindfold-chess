import { ACTION_ROW_CONTAINER_CLASSES } from '../../_lib/skeleton-layout-classes';
import { ActionButtonSkeleton } from './ActionButtonSkeleton';

type Props = {
  /** When true, reserve space for the Show Board button (modal peek mode). */
  showBoardButton: boolean;
};

/**
 * Skeleton for the action button row rendered by `GameInProgressPanel`:
 * optional Show Board + Undo + Resign. Outer layout is shared with the
 * real panel via `ACTION_ROW_CONTAINER_CLASSES` so the swap introduces no
 * CLS even if the row's flex/gap classes are tweaked later.
 */
export function ActionRowSkeleton({ showBoardButton }: Props) {
  return (
    <div aria-hidden className={ACTION_ROW_CONTAINER_CLASSES}>
      {showBoardButton && <ActionButtonSkeleton />}
      <ActionButtonSkeleton />
      <ActionButtonSkeleton />
    </div>
  );
}
