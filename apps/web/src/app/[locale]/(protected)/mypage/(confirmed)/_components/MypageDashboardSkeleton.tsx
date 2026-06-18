import { PagePanel } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Full loading shell for the mypage area: centered title placeholder + panel +
 * dashboard skeleton. Shared by the `(protected)` layout's auth-gate `<Suspense>`
 * fallback and `(protected)/loading.tsx`, so a hard load and a client navigation
 * render the identical skeleton (no visual swap between phases).
 */
export function MypageLoadingFallback() {
  return (
    <div className="space-y-8">
      <div className="motion-safe:animate-pulse rounded-md bg-muted h-7 md:h-8 w-40 mx-auto mb-8" />
      <PagePanel>
        <MypageDashboardSkeleton />
      </PagePanel>
    </div>
  );
}

/**
 * Loading placeholder for the `/mypage` dashboard (`(confirmed)/page.tsx`).
 *
 * Shapes mirror the real page's blocks (profile card → level bar → coin chip →
 * heatmap → dashboard sections) so the skeleton occupies the same vertical
 * rhythm and the content swap is a fill-in rather than a reflow. Rendered as a
 * fragment so the surrounding `PagePanel`'s `space-y-8` provides the gaps,
 * matching the page where these are direct children of the panel.
 */
export function MypageDashboardSkeleton() {
  return (
    <>
      {/* Profile card: avatar + name lines + action buttons */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Level progress: label + bar + caption */}
      <div className="mt-4">
        <Skeleton className="h-4 w-48 mb-1.5" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-32 mt-1" />
      </div>

      {/* Coin balance chip */}
      <Skeleton className="mt-3 h-14 w-full rounded-lg" />

      {/* Exp activity heatmap card */}
      <section className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-24 w-full rounded-md" />
      </section>

      {/* Dashboard sections — header + a row of card chips, four times */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <Skeleton className="h-5 w-32" />
            <div className="flex flex-wrap gap-3 mt-3">
              <Skeleton className="h-20 w-32 rounded-lg" />
              <Skeleton className="h-20 w-32 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
