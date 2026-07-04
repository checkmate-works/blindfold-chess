import { DEFAULT_MOVE_INPUT_HINT } from '@/lib/games/move-input-cookie';

import { MoveInputSkeleton } from '@/app/[locale]/(public)/games/play/_components/MoveInputSkeleton';
import { IconButtonSkeleton } from '@/app/[locale]/(public)/games/play/_components/skeletons';
import {
  ACTION_ROW_CONTAINER_CLASSES,
  INLINE_BOARD_CARD_CHROME,
  INLINE_BOARD_HEADER_CHROME,
  INLINE_BOARD_HEADER_MIN_H,
  deriveMoveInputSkeletonProps,
} from '@/app/[locale]/(public)/games/play/_lib';
import { Skeleton } from '@/app/[locale]/_components';

const moveInputSkeletonProps = deriveMoveInputSkeletonProps(DEFAULT_MOVE_INPUT_HINT);

/**
 * Skeleton for the "board hybrid" `InlineBoardView` renders in Recall:
 * `defaultOpen` + no `alwaysOpen` means BOTH the collapse-accordion header
 * AND the open board are visible on first paint — a shape none of
 * `games/play`'s skeletons model (`AlwaysVisibleBoardSkeleton` has no header;
 * `InlineBoardHeaderSkeleton` has no open board). Composed here from the same
 * shared layout constants both of those use, so it stays in sync with any
 * future tweak to the header/card chrome.
 *
 * The board + nav-row fills use `!bg-border/40` (not the default `Skeleton`
 * `bg-muted`) for the same reason as `AlwaysVisibleBoardSkeleton`: it's the
 * single largest element here, and `bg-muted` is too close to `bg-card` to
 * read as a placeholder rather than an empty gap.
 */
function RecallBoardSkeleton() {
  return (
    <div className={INLINE_BOARD_CARD_CHROME}>
      <div className={`${INLINE_BOARD_HEADER_CHROME} ${INLINE_BOARD_HEADER_MIN_H}`}>
        <div className="flex items-center gap-2">
          <Skeleton disableAnimation className="h-4 w-4 rounded-sm" />
          <Skeleton disableAnimation className="h-4 w-24" />
        </div>
        <Skeleton disableAnimation className="h-3 w-3 rounded-sm" />
      </div>
      <Skeleton className="w-full aspect-square rounded-none !bg-border/40" />
      <div className="w-full" style={{ aspectRatio: '8/1' }}>
        <Skeleton className="w-full h-full rounded-none !bg-border/40" />
      </div>
    </div>
  );
}

/** Mirrors `ProgressBar`: a `text-sm mb-2` label row above an `h-2` bar. */
function RecallProgressBarSkeleton() {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <Skeleton disableAnimation className="h-4 w-16" />
      </div>
      <Skeleton disableAnimation className="h-2 w-full rounded-full" />
    </div>
  );
}

/**
 * Mirrors `RecallMovesPanel`: unlike `games/play`'s `MovesPanel` (collapsed
 * by default), this panel is always expanded — header + move rows + the
 * secondary-button stack (Analyze on Lichess / Copy PGN / Copy FEN) — so
 * `MovesPanelSkeleton` (header-only) is the wrong shape here.
 */
function RecallMovesPanelSkeleton() {
  return (
    <div className="lg:col-span-1">
      <div className="border border-border rounded-lg">
        <div className="px-4 py-3 bg-muted/30 rounded-t-lg">
          <Skeleton disableAnimation className="h-5 w-16" />
        </div>
        <div className="p-4">
          <div className="space-y-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 h-[26px]">
                <Skeleton disableAnimation className="h-3 w-6" />
                <Skeleton disableAnimation className="h-3 flex-1" />
                <Skeleton disableAnimation className="h-3 flex-1" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <Skeleton disableAnimation className="h-9 w-full rounded-md" />
            <Skeleton disableAnimation className="h-9 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for {@link RecallClient}'s not-yet-completed shape — shown when
 * `/practice/recall` is entered with `pgn`/`moves` already in the URL (a
 * "Recall" deep-link from a finished game). Mirrors, top to bottom: progress
 * bar, board (open + header), move input, auto-opponent checkbox, "Don't
 * know" action row, settings gear — plus the always-expanded moves panel.
 */
export function RecallReviewSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="border border-border rounded-lg p-4">
          <div className="flex flex-col gap-6">
            <RecallProgressBarSkeleton />
            <RecallBoardSkeleton />
            <MoveInputSkeleton
              mode={moveInputSkeletonProps.mode}
              hasModeSwitch={moveInputSkeletonProps.hasModeSwitch}
            />
            {/* Auto-opponent checkbox row */}
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2">
                <Skeleton disableAnimation className="h-4 w-4 rounded-sm" />
                <Skeleton disableAnimation className="h-4 w-40" />
              </div>
            </div>
            {/* "Don't know" action row */}
            <div className={ACTION_ROW_CONTAINER_CLASSES}>
              <Skeleton disableAnimation className="h-[38px] w-28 rounded-md" />
            </div>
            <IconButtonSkeleton />
          </div>
        </div>
      </div>
      <RecallMovesPanelSkeleton />
    </div>
  );
}
