import { PagePanel } from '@/app/[locale]/_components';

import { DashboardSkeleton } from './DashboardSkeleton';

/**
 * Full loading shell for `/mypage/challenges` (centered title + panel +
 * {@link DashboardSkeleton}). Selected by `resolveLoadingFallback`
 * (`(protected)/_lib/resolveLoadingFallback.tsx`) for both the `(protected)`
 * layout's auth-gate `<Suspense>` (hard loads / refreshes) and
 * `(protected)/loading.tsx` (client-side navigations) — this route
 * deliberately has no folder-scoped `loading.tsx` of its own, so there is a
 * single place that picks the skeleton per route instead of two that could
 * drift apart.
 *
 * The title bar sits in a flex row with a circular placeholder for the
 * HelpTourButton "?" icon that the real page always renders next to its
 * title, so that row doesn't change width once the real button mounts.
 */
export function ChallengesLoadingFallback() {
  return (
    <div className="space-y-8">
      <div className="mb-8 flex items-center justify-center gap-2">
        <div className="motion-safe:animate-pulse rounded-md bg-muted h-7 md:h-8 w-40" />
        <div
          className="h-5 w-5 rounded-full bg-muted motion-safe:animate-pulse"
          aria-hidden="true"
        />
      </div>
      <PagePanel>
        <DashboardSkeleton />
      </PagePanel>
    </div>
  );
}
