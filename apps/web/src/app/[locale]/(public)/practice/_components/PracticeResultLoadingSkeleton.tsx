import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

/**
 * Server `loading.tsx` skeleton shared by every practice result route.
 *
 * Mirrors `PracticeResultPage` (the wrapper rendered by all 11 result
 * routes via `createPracticeResultClient`):
 *
 *   <div className="space-y-8">
 *     <PageTitle>{title}</PageTitle>
 *     <PagePanel>
 *       <PracticeComplete .../>           // score summary + action buttons + related cards
 *       [<LeaderboardPreview />]          // most modules
 *       [ad slots / sign-up banner]
 *       <Divider />
 *       <Breadcrumb />
 *     </PagePanel>
 *   </div>
 *
 * The page title and intermediate breadcrumb items vary per module and can
 * only be resolved at render time — they use bar placeholders. The first and
 * last breadcrumb items (`navigation.practice`, `practice.result`) are
 * static and render real translated strings. Conditional sections
 * (LeaderboardPreview, related-module CardLink) are always reserved here
 * because most modules render them and omitting causes more CLS than slight
 * over-allocation.
 *
 * Distinct from `PracticeResultSkeleton`, which is a smaller inline fallback
 * used by client-side session components — see that file for the rationale.
 */
export async function PracticeResultLoadingSkeleton() {
  const [tPractice, tNav] = await Promise.all([
    getTranslations('practice'),
    getTranslations('navigation'),
  ]);

  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="inline-block h-7 md:h-8 w-2/3 bg-muted rounded align-middle animate-pulse" />
      </PageTitle>

      <PagePanel>
        {/* PracticeCompleteSummary: score + subtitle + average time */}
        <div className="text-center flex flex-col items-center animate-pulse">
          <div className="h-10 w-32 bg-muted rounded mb-2" />
          <div className="h-5 w-24 bg-muted rounded mb-2" />
          <div className="h-4 w-40 bg-muted rounded" />
        </div>

        {/* Action buttons (Try Again / Change Settings, etc.) */}
        <div className="space-y-4">
          <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
        </div>

        {/* Related module CardLink (most modules render one). Rendered BEFORE
            LeaderboardPreview to match the real flow: PracticeComplete (which
            ends with the related-module card) precedes LeaderboardPreview in
            createPracticeResultClient. */}
        <div className="p-6 bg-card rounded-md border border-border animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 bg-muted rounded flex-shrink-0" />
            <div className="flex-1">
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
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

        {/* Mirror `PageLayout`'s trailing `!mt-4 space-y-4` block (see
            PageLayout.tsx) so the divider→breadcrumb spacing matches the
            real page exactly during loading. */}
        <div className="!mt-4 space-y-4">
          <Divider />

          {/* Breadcrumb: [Home logo] / Practice / <module> / Result. Leading
              home-logo `<li>` mirrors `BreadcrumbContent` (Breadcrumb.tsx)
              so the logo + first separator do not pop in on hydration. The
              first and last text items are static i18n strings; the middle
              module name uses a bar placeholder. Compact density (`min-h-6`,
              no `mb-4`) matches the `PageLayout` loaded state. */}
          <nav aria-label="Breadcrumb" className="flex min-h-6 items-center">
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
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
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
