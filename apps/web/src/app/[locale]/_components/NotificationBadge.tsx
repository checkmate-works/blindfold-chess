'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { NOTIFICATIONS_READ_EVENT } from '@/config';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { FiBell } from 'react-icons/fi';

import { getUnreadCount } from '@/app/[locale]/(protected)/mypage/(confirmed)/notifications/_actions';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

/**
 * Header bell with an unread-notification count.
 *
 * The count is read exactly twice: once from the session
 * (`getSessionUser()` resolves it alongside the profile lookup and
 * `AuthContext` hands it over, so mounting the bell costs no request of its
 * own) and again whenever this tab marks notifications as read and dispatches
 * `NOTIFICATIONS_READ_EVENT` — that second read is what makes the badge
 * disappear as the user works through the list, and it is worth a request
 * because the user is watching the number at that moment.
 *
 * Between those two points the badge is deliberately stale. It does not
 * refresh on navigation: it used to re-run the `getUnreadCount` Server Action
 * from an effect keyed on `usePathname()`, which billed a
 * `POST /<current-path>` — invocation, auth check and count query — for every
 * soft navigation in the app, to update a number that moves a few times a day
 * and is purely informational until the user opens the notifications page
 * (which renders its own list from a fresh query). A notification that arrives
 * mid-session therefore shows up on the next full page load or sign-in, not on
 * the next link click. There is no polling and no realtime subscription; if
 * the badge ever needs to be live, that is the piece to add, not a per-
 * navigation refetch.
 *
 * (The former per-navigation effect also needed a cancellation flag, because
 * two quick navigations raced and the staler response could resolve last.
 * With a single event-driven refetch left, that race is gone — the flag below
 * only guards a `setState` after unmount.)
 */
export function NotificationBadge() {
  const locale = useLocale();
  const { unreadNotificationCount } = useAuth();
  const [unreadCount, setUnreadCount] = useState(unreadNotificationCount);

  // Re-seed when the session resolves a new count — `refreshUser()` (e.g.
  // after username setup) and sign-out both flow through here, so the badge
  // follows the session instead of holding the value it mounted with.
  useEffect(() => {
    setUnreadCount(unreadNotificationCount);
  }, [unreadNotificationCount]);

  useEffect(() => {
    let cancelled = false;
    const handleNotificationsRead = () => {
      getUnreadCount()
        .then((count) => {
          if (!cancelled) setUnreadCount(count);
        })
        .catch(() => {});
    };

    window.addEventListener(NOTIFICATIONS_READ_EVENT, handleNotificationsRead);

    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, handleNotificationsRead);
    };
  }, []);

  return (
    // Low-intent link: opt out of viewport prefetch. The bell is mounted in
    // the header on every page and is therefore always in view, but is rarely
    // clicked — and the notifications page is dynamic, so each prefetch costs
    // an Edge auth round trip plus a partial render.
    <Link
      href={`/${locale}/mypage/notifications`}
      prefetch={false}
      className="relative flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Notifications"
    >
      <FiBell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
