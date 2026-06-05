import { Skeleton } from '@/app/[locale]/_components';

import { INLINE_BOARD_CARD_CHROME } from '../../_lib/skeleton-layout-classes';

/**
 * Skeleton for the pure-blindfold ('never') board layout. In that mode
 * `InlineBoardView` renders NO board — just a compact `h-16` bar holding the
 * status pill (and the settings gear). Reserving that exact height here, rather
 * than the full-size `AlwaysVisibleBoardSkeleton`, keeps the SSR→hydration
 * handoff CLS-free for 'never'-mode users (otherwise the ~512px board skeleton
 * would collapse to ~64px on hydration).
 *
 * The `h-16` inner box and `INLINE_BOARD_CARD_CHROME` wrapper mirror the real
 * compact bar in `InlineBoardView`; the centered pill placeholder mirrors the
 * `STATUS_PILL_CLASSES` status pill (h-10).
 */
export function CompactBoardSkeleton() {
  return (
    <div aria-hidden className={INLINE_BOARD_CARD_CHROME}>
      <div className="flex h-16 items-center justify-center px-4">
        <Skeleton disableAnimation className="h-10 w-40 rounded-full" />
      </div>
    </div>
  );
}
