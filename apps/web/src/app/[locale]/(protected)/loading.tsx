import { MypageLoadingFallback } from './_components/MypageLoadingFallback';

/**
 * Pending UI for client-side navigations into the protected area. The hard-load
 * case (post-sign-in) is handled by the explicit `<Suspense>` in `layout.tsx`;
 * both render the same neutral {@link MypageLoadingFallback}. Individual routes
 * (e.g. `profile/loading.tsx`) override this with a layout-matched skeleton.
 */
export default function Loading() {
  return <MypageLoadingFallback />;
}
