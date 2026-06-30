import { getLocale, getTranslations } from 'next-intl/server';

import { BoardSkeleton } from '@/app/_components';

import { createClient } from '@/lib/supabase/server';

import { SectionTitle } from '@/app/[locale]/_components';

/**
 * Inner-content skeleton for the puzzle result, shaped like the part of
 * `PuzzleResultClient` that renders inside `<PagePanel>` (before the divider /
 * breadcrumb): the solution-replay section title, the board, the solution line,
 * the EXP gain card / sign-up banner, and the three action buttons.
 *
 * The puzzle result page renders its chrome (PageTitle / PagePanel / Breadcrumb
 * via `PageLayout`) on the server, OUTSIDE the client component — so unlike the
 * other result pages it never flashes to bare background. But `PuzzleResultClient`
 * is still a client component whose chunk can lag on a soft navigation; without
 * an inner `<Suspense>` fallback the panel body would briefly empty (or bubble
 * up and re-show the whole route `loading.tsx`). This fills just the body.
 *
 * Shared with the route `loading.tsx` (`PuzzleResultLoading`), which wraps this
 * in the PageTitle + PagePanel + breadcrumb chrome, so the loading state and the
 * chunk-load fallback are one shape.
 *
 * `ExpGainDisplay` (authenticated) and `SignUpBanner` (anonymous) occupy the
 * same slot above the buttons and are mutually exclusive by auth state, so the
 * user is resolved here and exactly one full-height placeholder is reserved —
 * matching the real card/banner rather than a thin bar.
 */
export async function PuzzleResultContentSkeleton() {
  const locale = await getLocale();
  const supabase = await createClient();
  const [t, userResult] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.puzzle' }),
    supabase.auth.getUser(),
  ]);
  const isAuthed = !!userResult.data.user;

  return (
    <div className="space-y-6">
      {/* PuzzleSolutionReplay: section title + board + solution line */}
      <div className="space-y-6">
        <SectionTitle>{t('result.replaySection')}</SectionTitle>

        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <BoardSkeleton />
          </div>
        </div>

        {/* Solution text — single-move case is the common one
            (`Solution: <san>`). Multi-move puzzles render a numbered list,
            but a single centered bar tracks the visual weight of either
            shape closely enough that swapping in the real content does
            not jolt the page. */}
        <div className="flex justify-center">
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* ExpGainDisplay (authenticated) / SignUpBanner (anonymous) — same slot,
          mutually exclusive. Reserve the matching full-height block so the real
          content does not push the buttons down on hydrate. */}
      {isAuthed ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">EXP</span>
            <span className="inline-block h-5 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-block h-4 w-12 bg-muted rounded animate-pulse" />
              <span className="inline-block h-3 w-8 bg-muted rounded animate-pulse" />
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-muted h-2 w-1/3 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="w-full">
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
              <div className="mt-2 h-4 w-56 max-w-full bg-muted rounded animate-pulse" />
            </div>
            <div className="h-9 w-28 flex-shrink-0 bg-muted rounded-md animate-pulse" />
          </div>
        </div>
      )}

      {/* Action buttons (Try Again / Back to Puzzles / Analyze on Lichess) —
          three full-width buttons, matching the real `flex flex-col gap-3 pt-4`
          block. */}
      <div className="flex flex-col gap-3 pt-4">
        <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
        <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
        <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
