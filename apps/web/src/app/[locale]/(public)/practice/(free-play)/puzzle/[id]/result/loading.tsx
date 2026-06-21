import { getLocale, getTranslations } from 'next-intl/server';

import { BoardSkeleton } from '@/app/_components';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

/**
 * Puzzle result loading skeleton.
 *
 * Tailored to `PuzzleResultClient` (apps/web/src/app/[locale]/(public)/practice/(free-play)/puzzle/_components/PuzzleResultClient.tsx),
 * which renders into `<PagePanel>` under a static `<PageTitle>`. The shared
 * `PracticeResultLoadingSkeleton` was designed for the 11 challenge result
 * pages (score summary + leaderboard + related-module card) and matches none
 * of the puzzle result content, so it is not reused here.
 *
 * Mirrored sections (in render order):
 *   - PageTitle "Puzzle Result"                              — static i18n
 *   - SectionTitle "Solution Replay"                         — static i18n
 *   - Chess board (max-w-md, square)                         — `<BoardSkeleton>`
 *   - Solution text                                          — single bar
 *   - ExpGainDisplay                                         — conditional, reserved
 *   - 2 action buttons (Try Again / Back to Puzzles)         — full-width primary + secondary
 *   - Divider + Breadcrumb (Home / Practice / Puzzle / <position bar> / Puzzle Result)
 *
 * Conditional client-only sections (Attempt History, peek count) are NOT
 * reserved here. They render only after `PuzzleResultClient` reads
 * `sessionStorage` post-hydration, so they are absent from the SSR output the
 * skeleton swaps into and reserving them would create the opposite of the
 * usual CLS — a collapse on hydrate.
 */
export default async function PuzzleResultLoading() {
  // `loading.tsx` can't receive `params`, and the bare `getTranslations()`
  // resolves against the locale set by `setRequestLocale` — which hasn't run
  // yet while the page is still suspended, so it falls back to the default
  // locale and renders the static text in English on a `ja` page. Resolve the
  // request locale explicitly so the skeleton's text is localized from the
  // first paint.
  const locale = await getLocale();
  const [t, tNav] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.puzzle' }),
    getTranslations({ locale, namespace: 'navigation' }),
  ]);

  return (
    <div className="space-y-8">
      <PageTitle>{t('result.title')}</PageTitle>

      <PagePanel>
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

        <Divider />

        {/* Breadcrumb: [Home logo] / Practice / Puzzle / <puzzle title bar> /
            Puzzle Result. Composition mirrors the page's `<Breadcrumb>` items
            — three static crumbs (`navigation.practice`,
            `practice.puzzle.list.title`, `practice.puzzle.result.title`) plus
            one dynamic crumb (the puzzle title, fetched per request). */}
        <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
          <ol className="flex flex-wrap items-center gap-x-1 text-sm">
            <li>
              <div className="w-6 h-6 rounded-sm bg-muted animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{tNav('practice')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{t('list.title')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{t('result.title')}</span>
            </li>
          </ol>
        </nav>
      </PagePanel>
    </div>
  );
}
