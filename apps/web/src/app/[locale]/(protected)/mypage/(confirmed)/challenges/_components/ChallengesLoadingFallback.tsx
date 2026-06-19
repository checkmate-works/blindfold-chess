import { PagePanel } from '@/app/[locale]/_components';

import { DashboardSkeleton } from './DashboardSkeleton';

/**
 * Full loading shell for `/mypage/challenges` (centered title + panel +
 * {@link DashboardSkeleton}). Shared by `challenges/loading.tsx` (client-side
 * navigations) and the `(protected)` layout's route-aware gate fallback (hard
 * loads / refreshes), so both render the same skeleton — without the gate
 * registration a hard load would flash the neutral fallback first and then
 * swap to this one.
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
