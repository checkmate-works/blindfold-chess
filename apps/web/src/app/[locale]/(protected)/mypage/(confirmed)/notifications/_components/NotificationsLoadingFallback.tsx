import { PagePanel, Skeleton } from '@/app/[locale]/_components';

/**
 * Single skeleton notification row, mirroring `NotificationItem`'s shape:
 * `flex items-start gap-4 rounded-lg border p-4`, a 40×40 leading avatar, and a
 * two-line text column (message + relative time).
 */
function NotificationRowSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border p-4">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Full loading shell for `/mypage/notifications` (centered title + panel + a
 * list of {@link NotificationRowSkeleton}). Selected by `resolveLoadingFallback`
 * (`(protected)/_lib/resolveLoadingFallback.tsx`) for both the `(protected)`
 * layout's auth-gate `<Suspense>` (hard loads / refreshes) and
 * `(protected)/loading.tsx` (client-side navigations) — this route
 * deliberately has no folder-scoped `loading.tsx` of its own, so there is a
 * single place that picks the skeleton per route instead of two that could
 * drift apart.
 */
export function NotificationsLoadingFallback() {
  return (
    <div className="space-y-8">
      <div className="motion-safe:animate-pulse rounded-md bg-muted h-7 md:h-8 w-40 mx-auto mb-8" />
      <PagePanel>
        <div className="flex justify-end">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NotificationRowSkeleton key={i} />
          ))}
        </div>
      </PagePanel>
    </div>
  );
}
