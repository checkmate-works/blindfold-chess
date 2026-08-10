import { PagePanel, Skeleton } from '@/app/[locale]/_components';

/**
 * Neutral loading shell for the protected (mypage) area, used by the auth-gate
 * `<Suspense>` in `layout.tsx` and by `(protected)/loading.tsx`.
 *
 * Kept intentionally generic: this fallback is shared by *every* mypage route,
 * so it must not mimic any single page's layout — a page-specific shape (e.g.
 * the dashboard's profile-card + heatmap) looks misaligned on the others (the
 * profile form, the likes list, …). Routes that want a tailored skeleton add
 * their own `loading.tsx`, which takes over once the auth gate has passed.
 */
export function MypageLoadingFallback() {
  return (
    <div className="space-y-8">
      <div className="motion-safe:animate-pulse rounded-md bg-muted h-7 md:h-8 w-40 mx-auto mb-8" />
      <PagePanel>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>
      </PagePanel>
    </div>
  );
}
