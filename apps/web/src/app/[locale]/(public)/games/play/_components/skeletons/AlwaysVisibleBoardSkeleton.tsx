import { Skeleton } from '@/app/[locale]/_components';

import { INLINE_BOARD_CARD_CHROME } from '../../_lib/skeleton-layout-classes';
import { MOVE_NAV_ROW_CLASS } from '../MoveNavigationRow';

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
 * The nav-controls row shares `MOVE_NAV_ROW_CLASS` with the real UI — an
 * eighth of the board's height (one rank) on desktop, floored at the
 * touch-target height on mobile — so the column height pinned by the
 * skeleton matches the hydrated state.
 *
 * Unlike most skeleton shapes in this route (which disable the pulse to
 * avoid many small bars animating out of phase), the board and nav-row
 * blocks keep it — they're the single largest element on the page, so
 * motion alone should read as "loading". But `Skeleton`'s default `bg-muted`
 * fill sits only ~8% off `card` in light mode (barely 1% off in dark mode),
 * so even pulsing it was too subtle to actually notice at a glance. It's
 * also the ONLY visual boundary on mobile: `INLINE_BOARD_CARD_CHROME` drops
 * its border below `sm` (full-bleed board), so there's no surrounding card
 * edge to lean on there the way desktop has. `!bg-border` (`!` needed since
 * `Skeleton` already bakes in `bg-muted` at the same specificity — Tailwind
 * doesn't define an order-of-appearance winner between same-property
 * utilities) reuses the `border` token as a fill instead, which is far
 * enough from `card` in both themes to read clearly on its own.
 */
export function AlwaysVisibleBoardSkeleton() {
  return (
    <div aria-hidden className={INLINE_BOARD_CARD_CHROME}>
      <Skeleton className="w-full aspect-square rounded-none !bg-border/40" />
      <div className={`w-full ${MOVE_NAV_ROW_CLASS}`}>
        <Skeleton className="w-full h-full min-h-14 sm:min-h-0 rounded-none !bg-border/40" />
      </div>
    </div>
  );
}
