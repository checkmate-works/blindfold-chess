import { FiSettings } from 'react-icons/fi';

import { PagePanel, PageTitle, Skeleton } from '@/app/[locale]/_components';

/**
 * `MypageNotifications.title` per locale, duplicated here on purpose: this
 * fallback renders before `getTranslations` is reachable (see the component
 * doc below), so it cannot look the string up from the message catalog.
 * Same tradeoff as `SITE_NAMES` in `_lib/metadata.ts` — a small, stable
 * string kept in code because the render path that needs it can't await.
 * Keep in sync with `MypageNotifications.title` in `src/messages/*.json`.
 */
const TITLE_BY_LOCALE: Record<string, string> = {
  en: 'Notifications',
  ja: '通知',
  es: 'Notificaciones',
  'pt-BR': 'Notificações',
};

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

type Props = {
  locale: string;
};

/**
 * Full loading shell for `/mypage/notifications` (real title + panel + a
 * list of {@link NotificationRowSkeleton}). Selected by `resolveLoadingFallback`
 * (`(protected)/_lib/resolveLoadingFallback.tsx`) for both the `(protected)`
 * layout's auth-gate `<Suspense>` (hard loads / refreshes) and
 * `(protected)/loading.tsx` (client-side navigations) — this route
 * deliberately has no folder-scoped `loading.tsx` of its own, so there is a
 * single place that picks the skeleton per route instead of two that could
 * drift apart.
 *
 * The title renders for real (via {@link PageTitle}, the same component
 * `PageLayout` uses) instead of a pulsing placeholder bar: it only depends on
 * `locale`, which is already known from the pathname at this point — unlike
 * the notification list below it, it never needs the auth/DB round-trip this
 * fallback exists to cover, so there's no reason to hide it.
 *
 * The mark-all-read / settings row is shaped to match the real row exactly
 * (`flex items-center justify-end gap-4`, a `h-4 w-4` circle for the gear
 * icon) so mounting the real content doesn't shift anything.
 */
export function NotificationsLoadingFallback({ locale }: Props) {
  const title = TITLE_BY_LOCALE[locale] ?? TITLE_BY_LOCALE.en;

  return (
    <div className="space-y-8">
      <PageTitle>{title}</PageTitle>
      <PagePanel>
        <div className="flex items-center justify-end gap-4">
          <Skeleton className="h-4 w-32" />
          <FiSettings className="h-4 w-4 text-muted-foreground" />
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
