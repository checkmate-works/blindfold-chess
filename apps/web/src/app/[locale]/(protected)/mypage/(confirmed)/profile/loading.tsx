import { ProfileLoadingFallback } from './_components/ProfileLoadingFallback';

/**
 * Pending UI for client-side navigations to `/mypage/profile`. The hard-load /
 * refresh case is handled by the `(protected)` layout's route-aware gate
 * fallback, which renders the same {@link ProfileLoadingFallback}.
 */
export default function Loading() {
  return <ProfileLoadingFallback />;
}
