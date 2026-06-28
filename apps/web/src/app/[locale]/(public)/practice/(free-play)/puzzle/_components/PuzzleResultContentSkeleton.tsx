import { getLocale, getTranslations } from 'next-intl/server';

import { BoardSkeleton } from '@/app/_components';

import { SectionTitle } from '@/app/[locale]/_components';

/**
 * Inner-content skeleton for the puzzle result, shaped like the part of
 * `PuzzleResultClient` that renders inside `<PagePanel>` (before the divider /
 * breadcrumb): the solution-replay section title, the board, the solution line,
 * the EXP gain placeholder, and the two action buttons.
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
 */
export async function PuzzleResultContentSkeleton() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });

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

      {/* ExpGainDisplay — conditional (logged-in + grant param). Reserve
          a small bar to avoid CLS for the authenticated path. */}
      <div className="h-6 w-32 mx-auto bg-muted rounded animate-pulse" />

      {/* Action buttons (Try Again / Back to Puzzles) — full-width primary
          + secondary, matching the real `flex flex-col gap-3 pt-4` block. */}
      <div className="flex flex-col gap-3 pt-4">
        <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
        <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
