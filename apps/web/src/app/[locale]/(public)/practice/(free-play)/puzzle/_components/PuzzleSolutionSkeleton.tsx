'use client';

import { BoardSkeleton } from '@/app/_components';

/**
 * Loading placeholder for the solution step's {@link PuzzleSolutionFields},
 * shown while the sessionStorage draft hydrates (`!step.ready`). Mirrors that
 * component's top-level structure — side-to-move row, board, solution section,
 * and the primary/secondary button stack — so the swap to the real fields once
 * hydration completes does not shift layout (no CLS). Reproduces the zero-moves
 * state (no move list / navigation controls yet), which is what renders on a
 * fresh entry to the step.
 */
export function PuzzleSolutionSkeleton() {
  return (
    <>
      {/* Side-to-move indicator + flip button. */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="h-9 w-9 animate-pulse rounded bg-muted" />
      </div>

      {/* Board. */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <BoardSkeleton />
        </div>
      </div>

      {/* Solution section: label row + move-input placeholder. */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-11 w-full animate-pulse rounded bg-muted/40" />
      </div>

      {/* Primary / secondary button stack. */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="h-12 w-full animate-pulse rounded bg-muted" />
        <div className="h-12 w-full animate-pulse rounded bg-muted" />
      </div>
    </>
  );
}
