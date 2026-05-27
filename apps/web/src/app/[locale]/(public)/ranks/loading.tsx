import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

/**
 * Ranks page loading skeleton.
 *
 * Shown while the server fetches rank definitions and the current user's
 * achievements. Mirrors the page.tsx structure (space-y-8 > PageTitle >
 * PagePanel > SectionTitle + subtitle + SignUpBanner + card grid gap-6) to
 * minimise CLS. PageTitle / SectionTitle / subtitle are all static and
 * resolve from the `ranks` namespace; rank cards (DB-driven) stay as bar
 * placeholders.
 */
export default async function RanksLoading() {
  const t = await getTranslations('ranks');

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('pageTitle')}</SectionTitle>
        <p className="text-muted-foreground">{t('pageSubtitle')}</p>

        {/* SignUpBanner skeleton */}
        <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
          <div className="h-5 bg-muted rounded w-3/4 mb-2" />
          <div className="h-4 bg-muted rounded w-1/2 mb-3" />
          <div className="h-9 bg-muted rounded w-32" />
        </div>

        {/* Rank card grid — 7 cards matching ALL_RANK_SLUGS length */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-lg border border-border bg-card animate-pulse"
            >
              {/* Belt color bar */}
              <div className="h-2 bg-muted" />

              <div className="space-y-4 p-4 sm:p-5">
                {/* Rank name with color badge */}
                <div className="flex items-center gap-3">
                  <div className="size-4 rounded-full bg-muted shrink-0" />
                  <div className="h-5 w-24 bg-muted rounded" />
                </div>

                {/* Requirements placeholder */}
                <div>
                  <div className="h-3 bg-muted rounded w-20 mb-2" />
                  <div className="h-4 bg-muted rounded w-full mb-1" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Divider />

        {/* Breadcrumb: [Home logo] / Ranks. Single static crumb mirrors
            `ranks/page.tsx`'s `<Breadcrumb items={[{ label: t('pageTitle') }]} />`. */}
        <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
          <ol className="flex flex-wrap items-center gap-x-1 text-sm">
            <li>
              <div className="w-6 h-6 rounded-sm bg-muted animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{t('pageTitle')}</span>
            </li>
          </ol>
        </nav>
      </PagePanel>
    </div>
  );
}
