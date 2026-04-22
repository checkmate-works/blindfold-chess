import { PagePanel, PageTitle } from '@/app/[locale]/_components';

/**
 * Ranks page loading skeleton.
 *
 * Shown while the server fetches rank definitions and the current user's
 * achievements. Mirrors the page.tsx structure (space-y-8 > PageTitle >
 * PagePanel > SectionTitle + subtitle + SignUpBanner + card grid gap-6)
 * to minimise CLS.
 */
export default function RanksLoading() {
  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="invisible">Loading</span>
      </PageTitle>

      <PagePanel>
        {/* SectionTitle skeleton */}
        <div className="border-b border-border pb-2">
          <div className="h-5 md:h-6 bg-muted rounded w-48 animate-pulse" />
        </div>

        {/* Subtitle skeleton */}
        <div className="h-4 bg-muted rounded w-64 animate-pulse" />

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
              className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm animate-pulse"
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
      </PagePanel>
    </div>
  );
}
