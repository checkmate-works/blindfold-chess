import { NotificationsLoadingFallback } from './_components/NotificationsLoadingFallback';

/**
 * Pending UI for client-side navigations to `/mypage/notifications`. The hard-load
 * / refresh case is handled by the `(protected)` layout's route-aware gate
 * fallback, which renders the same {@link NotificationsLoadingFallback}.
 */
export default function Loading() {
  return <NotificationsLoadingFallback />;
}
