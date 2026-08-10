'use client';

import { BoardFrame, BoardSkeleton } from '@/app/_components';

import { Skeleton } from '@/app/[locale]/_components/Skeleton';

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
        <Skeleton className="h-5 w-28 rounded" />
        <Skeleton className="h-9 w-9 rounded" />
      </div>

      {/* Board. */}
      <BoardFrame>
        <BoardSkeleton />
      </BoardFrame>

      {/* Solution section: label row + move-input placeholder. */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-4 w-10 rounded" />
        </div>
        <div className="h-11 w-full animate-pulse rounded bg-muted/40" />
      </div>

      {/* Primary / secondary button stack. */}
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-12 w-full rounded" />
        <Skeleton className="h-12 w-full rounded" />
      </div>
    </>
  );
}
