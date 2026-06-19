import { MypageLoadingFallback } from '../_components/MypageLoadingFallback';
import { MypageDashboardLoadingFallback } from '../mypage/(confirmed)/_components/MypageDashboardLoadingFallback';
import { ChallengesLoadingFallback } from '../mypage/(confirmed)/challenges/_components/ChallengesLoadingFallback';
import { ProfileLoadingFallback } from '../mypage/(confirmed)/profile/_components/ProfileLoadingFallback';

/**
 * Maps a pathname to the loading skeleton that matches the route being loaded.
 *
 * Shared by BOTH Suspense boundaries that wrap a protected route on a hard load:
 * 1. the `(protected)` layout's auth-gate `<Suspense>` (covers `getUser()`), and
 * 2. `loading.tsx` (the inner boundary covering the `(confirmed)` layout's auth
 *    + the page's data fetch — and client-side navigations).
 *
 * Both must resolve to the SAME skeleton for a given route, otherwise the user
 * sees the correct skeleton during phase 1 and then a mismatched one during
 * phase 2. This previously bit `/mypage` (the dashboard top): the layout showed
 * the tailored {@link MypageDashboardLoadingFallback}, then the inner boundary
 * fell back to the neutral {@link MypageLoadingFallback}. The dashboard top is
 * the `(confirmed)` route-group index, so it cannot carry its own folder-scoped
 * `loading.tsx` without leaking that skeleton to every sibling route — making
 * this shared, route-aware resolver the fix.
 */
export function resolveLoadingFallback(pathname: string) {
  if (pathname.includes('/mypage/profile')) {
    return <ProfileLoadingFallback />;
  }
  // Covers `/mypage/challenges` and its `results` child (both use DashboardSkeleton).
  if (pathname.includes('/mypage/challenges')) {
    return <ChallengesLoadingFallback />;
  }
  // Dashboard top exactly (`/<locale>/mypage`), not its sub-routes.
  if (/\/mypage\/?$/.test(pathname)) {
    return <MypageDashboardLoadingFallback />;
  }
  return <MypageLoadingFallback />;
}
