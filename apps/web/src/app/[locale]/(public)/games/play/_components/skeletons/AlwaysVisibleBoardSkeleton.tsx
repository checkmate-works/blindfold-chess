import { Skeleton } from '@/app/[locale]/_components';

import { INLINE_BOARD_CARD_CHROME } from '../../_lib/skeleton-layout-classes';

/**
 * Skeleton for the always-visible board layout (boardVisibility === 'always').
 * Reserves space for the same chrome `InlineBoardView` renders in that mode:
 *
 *   ┌──────────────────────────────┐  ← INLINE_BOARD_CARD_CHROME wrapper
 *   │  (no header / no accordion)  │     — always mode has no toggle button
 *   ├──────────────────────────────┤
 *   │                              │
 *   │      ChessBoard (1:1)        │
 *   │                              │
 *   ├──────────────────────────────┤
 *   │  MoveNavigationControls 8:1  │
 *   └──────────────────────────────┘
 *
 * The horizontal move list (`px-2 py-1.5 overflow-x-auto`) is *not* reserved
 * here because it only renders once `formattedPgn.length > 0`, which is
 * always false at initial paint (no moves played yet). The first player
 * commit grows the card by one row inside the same hydrated component, so
 * the skeleton stays a faithful preview of the empty-state.
 *
 * The nav-controls row uses `aspectRatio: '8/1'` in the real UI, matching
 * the eighth of the board's height (one rank). We replicate that here so
 * the column height pinned by the skeleton matches the hydrated state.
 *
 * Unlike most skeleton shapes in this route (which disable the pulse to
 * avoid many small bars animating out of phase), the board and nav-row
 * blocks keep it: they're the single largest element on the page, and
 * `muted` sits only ~8% off `card` in light mode (barely 1% off in dark
 * mode), so a static fill read as an empty gap rather than a placeholder.
 * The pulse's motion — not just its color — is what signals "loading" here.
 */
export function AlwaysVisibleBoardSkeleton() {
  return (
    <div aria-hidden className={INLINE_BOARD_CARD_CHROME}>
      <Skeleton className="w-full aspect-square rounded-none" />
      <div className="w-full" style={{ aspectRatio: '8/1' }}>
        <Skeleton className="w-full h-full rounded-none" />
      </div>
    </div>
  );
}
