import { PagePanel } from '@/app/[locale]/_components';

import { ProfileSkeleton } from './ProfileSkeleton';

/**
 * Full loading shell for `/mypage/profile` (centered title + panel +
 * {@link ProfileSkeleton}). Shared by `profile/loading.tsx` (client-side
 * navigations) and the `(protected)` layout's route-aware auth-gate fallback
 * (hard loads / refreshes), so both render the identical profile skeleton.
 */
export function ProfileLoadingFallback() {
  return (
    <div className="space-y-8">
      <div className="motion-safe:animate-pulse rounded-md bg-muted h-7 md:h-8 w-40 mx-auto mb-8" />
      <PagePanel>
        <ProfileSkeleton />
      </PagePanel>
    </div>
  );
}
