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
 */
export function ChallengesLoadingFallback() {
  return (
    <div className="space-y-8">
      <div className="motion-safe:animate-pulse rounded-md bg-muted h-7 md:h-8 w-40 mx-auto mb-8" />
      <PagePanel>
        <DashboardSkeleton />
      </PagePanel>
    </div>
  );
}
