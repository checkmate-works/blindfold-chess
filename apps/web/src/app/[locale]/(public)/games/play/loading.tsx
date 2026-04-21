import { PagePanel, PageTitle } from '@/app/[locale]/_components';

import { MoveInputSkeleton } from './_components/MoveInputSkeleton';
import { MovesPanelSkeleton } from './_components/MovesPanelSkeleton';
import { ActionRowSkeleton, IconButtonSkeleton, TextLinkSkeleton } from './_components/skeletons';

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
          {/* Game area skeleton (2 cols).
              SSR cannot read persisted preferences, so we use defaults:
              `mode='button'`, `peekMode='modal'`, `showBoardButtonInGame=true`,
              single enabled input mode (no switcher). Users with other
              preferences will see a minor re-render after hydration. */}
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-6">
              <MoveInputSkeleton mode="button" />
              <ActionRowSkeleton showBoardButton />
              <TextLinkSkeleton />
              <IconButtonSkeleton />
            </div>
          </div>

          {/* Moves panel skeleton (1 col) */}
          <div className="lg:col-span-1">
            <MovesPanelSkeleton />
          </div>
        </div>

        {/* Divider skeleton */}
        <div className="border-t border-border my-6" />

        {/* Breadcrumb skeleton. Matches the real Breadcrumb's `<nav>` wrapper
            (mb-4 flex min-h-10 items-end) so that the handoff from
            loading.tsx to the hydrated Breadcrumb is CLS-free across all
            locales, including long-label cases that wrap to 2 lines. */}
        <div className="mb-4 flex min-h-10 w-48 items-end">
          <div className="h-4 w-full rounded bg-muted motion-safe:animate-pulse" />
        </div>
      </PagePanel>
    </div>
  );
}
