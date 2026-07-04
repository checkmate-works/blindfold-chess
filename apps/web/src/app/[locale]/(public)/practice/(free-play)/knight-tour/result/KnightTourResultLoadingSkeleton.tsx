import { getTranslations } from 'next-intl/server';

import { BoardSkeleton } from '@/app/_components';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

/**
 * Knight-tour result loading skeleton.
 *
 * The knight-tour result is a fully custom body (`KnightTourResult` via
 * `createCustomPracticeResultPage`) — a "squares visited" heading, the final
 * tour board, the action buttons, and a related-learning grid — NOT the shared
 * score-summary + leaderboard layout. The generic `PracticeResultLoadingSkeleton`
 * therefore matches none of it, so this dedicated skeleton mirrors the real
 * shape (the same approach as route-planner / puzzle).
 *
 * Chrome (PageTitle / PagePanel / Breadcrumb) mirrors `PageLayout`, which
 * `PracticeResultPage` wraps the content in. The board / buttons / related grid
 * fill the panel body.
 *
 * Used both as the route `loading.tsx` (re-exported there) and as the inner
 * `<Suspense>` fallback in `page.tsx` (via `createSimplePracticeResultPage`'s
 * `loadingFallback`), so the soft-navigation chunk-load gap shows this exact
 * shape.
 *
 * Knight-tour grants no EXP, so there is no EXP card to reserve. The
 * `SignUpBanner` (anonymous only) sits above the action buttons; the user is
 * resolved here so it is reserved only for guests. The conditional success
 * message (success runs only) is variable and intentionally not reserved.
 */
export async function KnightTourResultLoadingSkeleton() {
  const locale = await getLocaleFromPathnameHeader();
  const supabase = await createClient();
  const [t, tPractice, userResult] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.knightTour' }),
    getTranslations({ locale, namespace: 'practice' }),
    supabase.auth.getUser(),
  ]);
  const isAuthed = !!userResult.data.user;

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        {/* KnightTourResult body (wrapped in its own max-w-4xl PracticeLayout). */}
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            {/* "Squares visited: N / 64" heading (centered). */}
            <div className="mx-auto mb-6 h-8 w-56 bg-muted rounded animate-pulse" />

            {/* Final tour board. */}
            <div className="flex justify-center mb-6">
              <div className="w-full max-w-md">
                <BoardSkeleton />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-4">
              {/* SignUpBanner — anonymous players only. */}
              {!isAuthed && (
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

              {/* Try Again (primary) + More Practice (secondary) */}
              <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
              <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />

              {/* "Do other practice" link */}
              <div className="flex justify-center pt-2">
                <div className="h-4 w-40 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Related Learning (separate max-w-4xl PracticeLayout): SectionTitle +
            2-card grid (md:grid-cols-2). */}
        <div className="max-w-4xl mx-auto">
          <div className="mt-8 space-y-3">
            <SectionTitle>{tPractice('relatedLearning')}</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-6 bg-card rounded-md border border-border animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 bg-muted rounded flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mirror PageLayout's trailing divider + breadcrumb block. */}
        <div className="!mt-4 space-y-4">
          <Divider />

          <nav aria-label="Breadcrumb" className="flex min-h-6 items-center">
            <ol className="flex flex-wrap items-center gap-x-1 text-sm">
              <li>
                <div className="w-6 h-6 rounded-sm bg-muted animate-pulse" />
              </li>
              <li className="flex items-center">
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-muted-foreground">{tPractice('title')}</span>
              </li>
              <li className="flex items-center">
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-muted-foreground">{t('title')}</span>
              </li>
              <li className="flex items-center">
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-foreground font-medium">{tPractice('result')}</span>
              </li>
            </ol>
          </nav>
        </div>
      </PagePanel>
    </div>
  );
}
