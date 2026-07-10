'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { notifyNotificationsRead } from '@/config';
import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiBellOff } from 'react-icons/fi';

import { isMutableNotificationType } from '@/lib/notifications/mutable-types';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { markAsRead, setNotificationMute } from '../_actions';
import { buildNotificationLink } from '../_lib/notification-link';
import { buildNotificationMessage } from '../_lib/notification-message';
import type { NotificationWithActor } from '../_lib/queries';
import { NotificationAvatar } from './NotificationAvatar';

type Props = {
  notification: NotificationWithActor;
  currentUsername?: string;
};

export function NotificationItem({ notification, currentUsername }: Props) {
  const locale = useLocale();
  const t = useTranslations('MypageNotifications');
  // Root-scoped translator so `getAchievementDisplayName` can resolve
  // full-path keys like `Achievements.monthlyLeaderboard.name`.
  const tRoot = useTranslations();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showMuteConfirm, setShowMuteConfirm] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMuting, startMuteTransition] = useTransition();

  const actor = notification.actor;
  const actorName = actor?.displayName ?? actor?.username ?? '';
  const isMutable = isMutableNotificationType(notification.type);
  const typeLabel = isMutable ? tRoot(`Preferences.notifications.types.${notification.type}`) : '';

  function handleClick() {
    if (notification.isRead) return;
    startTransition(async () => {
      await markAsRead(notification.id);
      notifyNotificationsRead();
      router.refresh();
    });
  }

  function handleMuteConfirm() {
    startMuteTransition(async () => {
      await setNotificationMute(notification.type, true);
      setIsMuted(true);
      setShowMuteConfirm(false);
    });
  }

  const link = buildNotificationLink(notification, { currentUsername });
  const message = buildNotificationMessage(notification, { actorName, t, tRoot });
  const timeAgo = notification.createdAt.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // The avatar + message column is the only part wrapped in the clickable
  // Link/button — the mute affordance below is a sibling, not a nested
  // interactive element, since <button>-in-<button> and <button>-in-<a> are
  // both invalid HTML (and break keyboard/screen-reader navigation).
  const clickableInner = (
    <>
      <NotificationAvatar notification={notification} actorName={actorName} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </>
  );

  return (
    <>
      <div
        className={`flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 ${
          !notification.isRead ? 'bg-accent/30' : ''
        }`}
      >
        {link ? (
          <Link
            href={link}
            locale={locale}
            onClick={handleClick}
            className="flex min-w-0 flex-1 items-start gap-4"
          >
            {clickableInner}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            className="flex min-w-0 flex-1 items-start gap-4 text-left"
          >
            {clickableInner}
          </button>
        )}

        {isMutable && (
          <div className="flex-shrink-0 mt-1">
            {isMuted ? (
              <FiBellOff
                className="h-4 w-4 text-muted-foreground/50"
                role="img"
                aria-label={t('mutedLabel', { type: typeLabel })}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowMuteConfirm(true)}
                aria-label={t('muteButtonLabel', { type: typeLabel })}
                title={t('muteButtonLabel', { type: typeLabel })}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <FiBellOff className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {!notification.isRead && (
          <div className="flex-shrink-0 mt-1">
            <div className="h-2 w-2 rounded-full bg-link-primary" />
          </div>
        )}
      </div>

      {isMutable && (
        <ConfirmationModal
          isOpen={showMuteConfirm}
          title={t('muteConfirmTitle')}
          message={t('muteConfirmMessage', { type: typeLabel })}
          confirmText={t('muteConfirmButton')}
          cancelText={t('cancel')}
          isLoading={isMuting}
          onConfirm={handleMuteConfirm}
          onCancel={() => setShowMuteConfirm(false)}
        />
      )}
    </>
  );
}
