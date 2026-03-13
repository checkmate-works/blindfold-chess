'use client';

import { useEffect, useState } from 'react';

import { useLocale } from 'next-intl';
import Link from 'next/link';

import { NOTIFICATIONS_READ_EVENT } from '@/config';
import { FiBell } from 'react-icons/fi';

import { getUnreadCount } from '@/app/[locale]/(protected)/mypage/(confirmed)/notifications/_actions';

export function NotificationBadge() {
  const locale = useLocale();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleNotificationsRead = () => {
      setUnreadCount(0);
    };

    window.addEventListener(NOTIFICATIONS_READ_EVENT, handleNotificationsRead);

    return () => {
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, handleNotificationsRead);
    };
  }, []);

  return (
    <Link
      href={`/${locale}/mypage/notifications`}
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
