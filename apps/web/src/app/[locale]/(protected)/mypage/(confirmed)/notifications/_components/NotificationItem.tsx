'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { notifyNotificationsRead } from '@/config';
import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiBell, FiBellOff } from 'react-icons/fi';

import { formatLocalDate } from '@/lib/i18n/format-date';
import { isMutableNotificationType } from '@/lib/notifications/mutable-types';
import { resolveAuthorName } from '@/lib/users/display-name';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { markAsRead, setNotificationMute } from '../_actions';
import { buildNotificationLink } from '../_lib/notification-link';
import { buildNotificationMessage } from '../_lib/notification-message';
import type { NotificationWithActor } from '../_lib/queries';
import { NotificationAvatar } from './NotificationAvatar';

type Props = {
  notification: NotificationWithActor;
  currentUsername?: string;
  /** Whether `notification.type` is currently muted for the viewer. */
  isTypeMuted?: boolean;
};

export function NotificationItem({ notification, currentUsername, isTypeMuted = false }: Props) {
  const locale = useLocale();
  const t = useTranslations('MypageNotifications');
  // Root-scoped translator so `getAchievementDisplayName` can resolve
  // full-path keys like `Achievements.monthlyLeaderboard.name`.
  const tRoot = useTranslations();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showMuteConfirm, setShowMuteConfirm] = useState(false);
  // Seeded from the server (isTypeMuted) so a page reload reflects the real
  // mute status instead of resetting to "not muted" — see prop doc above.
  const [isMuted, setIsMuted] = useState(isTypeMuted);
  const [isMuting, startMuteTransition] = useTransition();

  const actor = notification.actor;
  const actorName = resolveAuthorName(actor, { fallback: '' });
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

  // Muting is the destructive direction (silences future notifications of
  // this type) and goes through the confirmation dialog below. Unmuting is
  // purely restorative, so it applies immediately with no confirmation —
  // this is what makes the icon a real toggle instead of a one-way action.
  function handleMuteConfirm() {
    startMuteTransition(async () => {
      await setNotificationMute(notification.type, true);
      setIsMuted(true);
      setShowMuteConfirm(false);
    });
  }

  function handleUnmute() {
    startMuteTransition(async () => {
      await setNotificationMute(notification.type, false);
      setIsMuted(false);
    });
  }

  const link = buildNotificationLink(notification, { currentUsername });
  const message = buildNotificationMessage(notification, { actorName, t, tRoot });
  const timeAgo = formatLocalDate(notification.createdAt, locale);

  // The message column is the only part wrapped in the clickable
  // Link/button. The avatar before it and the mute affordance after it are
  // siblings, not nested interactive elements: the avatar is its own link
  // to the actor's profile, and <a>-in-<a>, <button>-in-<button> and
  // <button>-in-<a> are all invalid HTML (and break keyboard/screen-reader
  // navigation). Opening a profile is not "checking the notification", so
  // the avatar link deliberately skips `handleClick` and leaves the row
  // unread.
  const clickableInner = (
    <div className="min-w-0 flex-1">
      <p className="text-sm text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
    </div>
  );

  return (
    <>
      <div
        className={`flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 ${
          !notification.isRead ? 'bg-accent/30' : ''
        }`}
      >
        <NotificationAvatar notification={notification} actorName={actorName} locale={locale} />
        {link ? (
          <Link
            href={link}
            locale={locale}
            onClick={handleClick}
            className="flex min-w-0 flex-1 items-start"
          >
            {clickableInner}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            className="flex min-w-0 flex-1 items-start text-left"
          >
            {clickableInner}
          </button>
        )}

        {isMutable && (
          <div className="flex-shrink-0 mt-1">
            <button
              type="button"
              disabled={isMuting}
              onClick={isMuted ? handleUnmute : () => setShowMuteConfirm(true)}
              aria-label={t(isMuted ? 'unmuteButtonLabel' : 'muteButtonLabel', { type: typeLabel })}
              title={t(isMuted ? 'unmuteButtonLabel' : 'muteButtonLabel', { type: typeLabel })}
              className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {isMuted ? <FiBellOff className="h-4 w-4" /> : <FiBell className="h-4 w-4" />}
            </button>
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
