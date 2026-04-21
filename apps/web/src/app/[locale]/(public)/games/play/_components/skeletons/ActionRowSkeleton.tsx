import { ActionButtonSkeleton } from './ActionButtonSkeleton';

type Props = {
  /** When true, reserve space for the Show Board button (modal peek mode). */
  showBoardButton: boolean;
};

/**
 * Skeleton for the action button row rendered by `GameInProgressPanel`:
 * optional Show Board + Undo + Resign. Outer layout mirrors the real row
 * (`flex gap-4 md:gap-2 justify-center`) so the swap introduces no CLS.
 */
export function ActionRowSkeleton({ showBoardButton }: Props) {
  return (
    <div aria-hidden className="flex justify-center gap-4 md:gap-2">
      {showBoardButton && <ActionButtonSkeleton />}
      <ActionButtonSkeleton />
      <ActionButtonSkeleton />
    </div>
  );
}
