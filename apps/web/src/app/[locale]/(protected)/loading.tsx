import { MypageLoadingFallback } from './mypage/(confirmed)/_components/MypageDashboardSkeleton';

/**
 * Pending UI for client-side navigations into the protected area. The hard-load
 * case (post-sign-in) is handled by the explicit `<Suspense>` in `layout.tsx`;
 * both render the same {@link MypageLoadingFallback} so the skeleton is identical.
 */
export default function Loading() {
  return <MypageLoadingFallback />;
}
