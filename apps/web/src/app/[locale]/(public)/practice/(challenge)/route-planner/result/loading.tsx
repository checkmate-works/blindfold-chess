import { getLocale, getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

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
 * The Problem Details list is variable-length (one row per completed problem);
 * 5 rows are reserved as a representative count, matching how LeaderboardPreview
 * always reserves 5. Conditional sections (`ExpGainDisplay`, `SignUpBanner`)
 * render null on the common paths and are intentionally not reserved.
 */
export default async function RoutePlannerResultLoading() {
  // `loading.tsx` can't receive `params`, and the bare `getTranslations()`
  // resolves against the locale set by `setRequestLocale` — which hasn't run
  // yet while the page is still suspended, so it falls back to the default
  // locale. Resolve the request locale explicitly so the skeleton's static
  // text (page title, breadcrumb) is localized from the first paint.
  const locale = await getLocale();
  const [t, tPractice] = await Promise.all([
    getTranslations({ locale, namespace: 'practice.routePlanner' }),
    getTranslations({ locale, namespace: 'practice' }),
  ]);

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        {/* PracticeCompleteSummary — `scoreStats` + `recreationProgress` are
            always set by `createPracticeResultClient`, so the summary renders
            its heading + accuracy-bar branch (NOT the big score/total number).
            The heading and "Accuracy" / "Average Time" labels are static i18n,
            so render the real text; only the dynamic bar/legend/value are
            placeholders. Emitted as two direct PagePanel children (h2 + div) to
            mirror the component's fragment so the `space-y-8` rhythm matches. */}
        <SectionTitle className="text-2xl font-bold mb-6">{tPractice('result')}</SectionTitle>

        <div className="mb-6">
          <p className="text-sm font-medium text-muted-foreground mb-2 text-left">
            {tPractice('accuracy')}
          </p>
          {/* SegmentedProgressBar: full-width h-8 bar + two-item legend */}
          <div className="h-8 w-full bg-muted rounded-lg animate-pulse" />
          <div className="flex justify-between mt-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1 animate-pulse">
                <div className="w-3 h-3 rounded bg-muted" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
          {/* Average Time line */}
          <p className="text-sm text-center text-muted-foreground mt-4">
            {tPractice('averageTime')}:{' '}
            <span className="inline-block h-3 w-12 bg-muted rounded align-middle animate-pulse" />
          </p>
        </div>

        {/* Problem Details: heading (static i18n) + collapsed result rows
            (RoutePlannerResultList) */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground mb-4">
            {tPractice('problemDetails')}
          </h3>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border p-3 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="h-3 w-3 bg-muted rounded" />
                  <div className="h-4 w-6 bg-muted rounded" />
                  <div className="h-5 w-5 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
                <div className="h-4 w-8 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons (Try Again / More Practice) */}
        <div className="space-y-4">
          <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
        </div>

        {/* Related Learning: SectionTitle (static i18n) + 2-card grid (md:grid-cols-3) */}
        <div className="space-y-3">
          <SectionTitle>{tPractice('relatedLearning')}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* LeaderboardPreview — header + 5-row table (rank | name | score) */}
        <div className="space-y-3">
          <SectionTitle>
            <span className="inline-block h-5 md:h-6 w-40 bg-muted rounded align-middle animate-pulse" />
          </SectionTitle>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="h-10 bg-muted" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-t border-border px-4 py-3 animate-pulse"
              >
                <div className="h-4 w-6 bg-muted rounded" />
                <div className="h-4 flex-1 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>

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
