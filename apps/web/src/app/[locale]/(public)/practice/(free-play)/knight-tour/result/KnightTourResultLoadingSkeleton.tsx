import { getTranslations } from 'next-intl/server';

import { BoardSkeleton } from '@/app/_components';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { createClient } from '@/lib/supabase/server';

import { SignUpBannerSkeleton } from '@/app/[locale]/(public)/practice/_components/skeletons';
import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { CardLinkSkeleton } from '@/app/[locale]/_components/CardLinkSkeleton';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

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
            <Skeleton className="mx-auto mb-6 h-8 w-56 rounded" />

            {/* Final tour board. */}
            <div className="flex justify-center mb-6">
              <div className="w-full max-w-md">
                <BoardSkeleton />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-4">
              {/* SignUpBanner — anonymous players only. */}
              {!isAuthed && <SignUpBannerSkeleton />}

              {/* Try Again (primary) + More Practice (secondary) */}
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />

              {/* "Do other practice" link */}
              <div className="flex justify-center pt-2">
                <Skeleton className="h-4 w-40 rounded" />
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
                <CardLinkSkeleton key={i} />
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
                <Skeleton className="w-6 h-6 rounded-sm" />
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
