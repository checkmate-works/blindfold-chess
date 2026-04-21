import { readPeekPreferenceFromCookies } from '@/lib/games/peek-cookie.server';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';

import { MoveInputSkeleton } from './_components/MoveInputSkeleton';
import { MovesPanelSkeleton } from './_components/MovesPanelSkeleton';
import {
  ActionRowSkeleton,
  IconButtonSkeleton,
  InlineBoardHeaderSkeleton,
  TextLinkSkeleton,
} from './_components/skeletons';
import { shouldShowInlinePeekHeader, shouldShowModalPeekButton } from './_lib';

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
 * `hasModeSwitch` is omitted here because `loading.tsx` only runs during
 * the initial route-segment transition and a minor upward adjustment for
 * multi-mode users is a small, bounded CLS only affecting that window.
 *
 * Peek-related reservations (`InlineBoardHeaderSkeleton` and the
 * `ActionRowSkeleton showBoardButton` slot) are driven by
 * `bfc_peek_pref` so inline-peek users and users who disabled the board
 * button get the correct layout during this transitional paint too.
 */
export default async function GamesPlayLoading() {
  const peekHint = await readPeekPreferenceFromCookies();
  const showInlinePeekHeader = shouldShowInlinePeekHeader(peekHint);
  const showModalPeekButton = shouldShowModalPeekButton(peekHint);

  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="invisible">Loading</span>
      </PageTitle>

      <PagePanel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game area skeleton (2 cols).
              `mode='button'` and the single-enabled-mode assumption still
              apply here (see component docs above). Peek-related slots are
              driven by the `bfc_peek_pref` cookie so returning users get
              the correct layout from this transitional paint onward. */}
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-6">
              {showInlinePeekHeader && <InlineBoardHeaderSkeleton />}
              <MoveInputSkeleton mode="button" />
              <ActionRowSkeleton showBoardButton={showModalPeekButton} />
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
