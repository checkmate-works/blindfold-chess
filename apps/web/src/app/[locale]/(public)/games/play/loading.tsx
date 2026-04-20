import { PagePanel, PageTitle } from '@/app/[locale]/_components';

import { MoveInputSkeleton } from './_components/MoveInputSkeleton';
import { MovesPanelSkeleton } from './_components/MovesPanelSkeleton';

/**
 * Games / play loading skeleton.
 *
 * Shown while the play page resolves. Mirrors the outer structure of
 * PlayPageClient (space-y-8 > PageTitle > PagePanel) and approximates
 * the initial game-in-progress layout (3-column grid with game area
 * and moves panel) to prevent CLS.
 *
 * The move-input column uses `MoveInputSkeleton` so that the SSR → client
 * hydration handoff does not introduce a visual jump. `button` is the
 * default input mode and the most common; if the user's saved preference
 * resolves to `text` or `select`, the swap after hydration is a visual
 * change only (the MoveInputSkeleton on the client also gates render
 * until preferences are hydrated).
 *
 * `hasModeSwitch` is omitted here because the SSR phase cannot read the
 * user's persisted preferences. We default to the common case (single
 * enabled mode, no switcher row). Users with 2+ modes enabled will see a
 * minor upward adjustment when the client-side skeleton re-renders with
 * the correct height; this is a small, bounded CLS and only affects the
 * initial paint → hydration window.
 */
export default function GamesPlayLoading() {
  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="invisible">Loading</span>
      </PageTitle>

      <PagePanel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game area skeleton (2 cols) */}
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-6">
              <MoveInputSkeleton mode="button" variant="initial" />
              {/* Reserve space for the action button row (Undo / Resign / Show Board) */}
              <div aria-hidden className="min-h-[40px]" />
              {/* Reserve space for the Save and Exit link */}
              <div aria-hidden className="min-h-[20px]" />
              {/* Reserve space for the Operation Log trigger */}
              <div aria-hidden className="min-h-[24px]" />
            </div>
          </div>

          {/* Moves panel skeleton (1 col) */}
          <div className="lg:col-span-1">
            <MovesPanelSkeleton />
          </div>
        </div>

        {/* Divider skeleton */}
        <div className="border-t border-border my-6" />

        {/* Breadcrumb skeleton */}
        <div className="h-4 bg-muted rounded w-48 motion-safe:animate-pulse" />
      </PagePanel>
    </div>
  );
}
