import { PagePanel } from '@/app/[locale]/_components';

import { MypageDashboardSkeleton } from './MypageDashboardSkeleton';

/**
 * Full loading shell for the `/mypage` dashboard (centered title + panel +
 * {@link MypageDashboardSkeleton}). Used by the `(protected)` layout's
 * route-aware auth-gate fallback so a hard load / refresh of (and the
 * post-sign-in landing on) the dashboard streams a matching skeleton.
 */
export function MypageDashboardLoadingFallback() {
  return (
    <div className="space-y-8">
      <div className="motion-safe:animate-pulse rounded-md bg-muted h-7 md:h-8 w-40 mx-auto mb-8" />
      <PagePanel>
        <MypageDashboardSkeleton />
      </PagePanel>
    </div>
  );
}
