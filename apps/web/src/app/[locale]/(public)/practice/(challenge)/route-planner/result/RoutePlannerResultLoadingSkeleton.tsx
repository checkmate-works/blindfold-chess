import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { getOptionalUser } from '@/lib/auth';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

import { RoutePlannerResultPanelSkeleton } from './RoutePlannerResultPanelSkeleton';

/**
 * Route-planner result loading skeleton.
 *
 * Tailored to `ResultClient`
 * (apps/web/src/app/[locale]/(public)/practice/(challenge)/route-planner/result/ResultClient.tsx),
 * built via `createPracticeResultClient`. The shared
 * `PracticeResultLoadingSkeleton` does not fit route-planner: it places the
 * action buttons directly under the score summary and reserves a single
 * full-width related-module card, whereas this module renders (in order)
 *
 *   - PracticeCompleteSummary          — score + subtitle + average time
 *   - Problem Details                  — `problemDetails` heading + RoutePlannerResultList
 *   - action buttons (Try Again / More Practice)
 *   - Related Learning                 — SectionTitle + 2-card grid (`md:grid-cols-3`)
 *   - LeaderboardPreview               — header + 5-row table
 *   - Divider + Breadcrumb
 *
 * The unreserved Problem Details list sits *between* the summary and the
 * buttons, so reusing the shared skeleton shifts the buttons / leaderboard down
 * on hydrate. The related section also differs in shape. Hence a dedicated
 * skeleton, mirroring the puzzle / position-memory precedent.
 *
 * Used both as the route `loading.tsx` (re-exported there) and as the inner
 * `<Suspense>` fallback in `page.tsx` (via `createLeaderboardPracticeResultPage`'s
 * `loadingFallback`), so the soft-navigation chunk-load gap shows this exact
 * shape instead of the shared skeleton or bare background.
 *
 * The Problem Details list is variable-length (one row per completed problem);
 * 5 rows are reserved as a representative count, matching how LeaderboardPreview
 * always reserves 5. `ExpGainDisplay` (authenticated) and `SignUpBanner`
 * (anonymous) are mutually exclusive by auth state, so exactly one is reserved
 * based on the resolved user — see `reserveExp` / `reserveSignUpBanner`.
 */
export async function RoutePlannerResultLoadingSkeleton() {
  const locale = await getLocaleFromPathnameHeader();
  const [t, tPractice, user] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.routePlanner' }),
    getTranslations({ locale, namespace: 'practice' }),
    getOptionalUser(),
  ]);

  // The EXP card (authenticated) and sign-up banner (anonymous) are mutually
  // exclusive by auth state. `loading.tsx` can't read the `?grant=` param, but a
  // user arriving here from a finished challenge always carries it, so auth
  // state alone is a good predictor of which block the real page will render.
  const isAuthed = !!user;

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <RoutePlannerResultPanelSkeleton
          labels={{
            result: tPractice('result'),
            accuracy: tPractice('accuracy'),
            averageTime: tPractice('averageTime'),
            problemDetails: tPractice('problemDetails'),
            relatedLearning: tPractice('relatedLearning'),
          }}
          reserveExp={isAuthed}
          reserveSignUpBanner={!isAuthed}
        />

        {/* Mirror `PageLayout`'s trailing `!mt-4 space-y-4` block so the
            divider→breadcrumb spacing matches the real page during loading. */}
        <div className="!mt-4 space-y-4">
          <Divider />

          {/* Breadcrumb: [Home logo] / Practice / Route Planner / Result.
              All three text crumbs resolve to real strings here (the module is
              known), unlike the shared skeleton's bar placeholder for the
              middle item. Compact density (`min-h-6`, no `mb-4`) matches the
              `PageLayout` loaded state. */}
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
