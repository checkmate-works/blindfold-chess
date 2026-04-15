'use client';

import { useTransition } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { notifyNotificationsRead } from '@/config';
import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { HiGift, HiMegaphone, HiTrophy } from 'react-icons/hi2';

import { getAchievementDisplayName } from '@/lib/achievements/display';
import { truncateContent } from '@/lib/truncate-content';

import { markAsRead } from '../_actions';
import type { NotificationWithActor } from '../_lib/queries';
import {
  isAchievementGrantedMetadata,
  isAnnouncementMetadata,
  isBenefitGrantMetadata,
  isPositionMetadata,
  isPostMetadata,
  isReplyMetadata,
} from '../_lib/type-guards';

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

  const actor = notification.actor;
  const actorName = actor?.displayName ?? actor?.username ?? '';

  function getMessage(): string {
    switch (notification.type) {
      case 'follow':
        return t('followMessage', { actor: actorName });
      case 'like':
        return t('likeMessage', { actor: actorName });
      case 'reply':
        return t('replyMessage', { actor: actorName });
      case 'new_post':
        return t('newPostMessage', { actor: actorName });
      case 'announcement':
        if (isAnnouncementMetadata(notification.metadata)) {
          return t('announcementMessage', { title: truncateContent(notification.metadata.title) });
        }
        return t('unknownNotification');
      case 'benefit_grant':
        if (isBenefitGrantMetadata(notification.metadata)) {
          if (notification.metadata.reason) {
            return notification.metadata.reason;
          }
          return t('benefitGrantMessage', { days: notification.metadata.durationDays });
        }
        return t('unknownNotification');
      case 'achievement_granted':
        if (isAchievementGrantedMetadata(notification.metadata)) {
          const { badges } = notification.metadata;
          if (badges.length === 1) {
            return t('achievementSingleMessage', {
              name: getAchievementDisplayName(
                { slug: badges[0].slug, category: 'monthly_leaderboard' },
                tRoot
              ),
            });
          }
          return t('achievementMultipleMessage', { count: String(badges.length) });
        }
        return t('unknownNotification');
      default:
        return t('unknownNotification');
    }
  }

  function getTopicSegment(topicType: string): string {
    if (topicType === 'opening') return 'openings';
    return `${topicType}s`;
  }

  function getLink(): string | null {
    if (notification.type === 'follow' && actor) {
      return `/u/${actor.username}`;
    }
    if (notification.type === 'like' && notification.targetType === 'position') {
      if (isPositionMetadata(notification.metadata)) {
        return `/practice/position-memory/${notification.metadata.positionId}`;
      }
      if (notification.targetId) {
        return `/practice/position-memory/${notification.targetId}`;
      }
    }
    if (
      (notification.type === 'like' ||
        notification.type === 'reply' ||
        notification.type === 'new_post') &&
      isPostMetadata(notification.metadata)
    ) {
      const segment = getTopicSegment(notification.metadata.topicType);
      const base = `/topics/${segment}/${notification.metadata.topicKey}/posts/${notification.metadata.postId}`;
      if (notification.type === 'reply' && isReplyMetadata(notification.metadata)) {
        return `${base}#reply-${notification.metadata.replyId}`;
      }
      return base;
    }
    if (notification.type === 'announcement' && isAnnouncementMetadata(notification.metadata)) {
      return `/announcements/${notification.metadata.slug}`;
    }
    if (notification.type === 'achievement_granted' && currentUsername) {
      return `/u/${currentUsername}/achievements`;
    }
    if (notification.type === 'benefit_grant') {
      return '/mypage/benefits';
    }
    return null;
  }

  function handleClick() {
    if (notification.isRead) return;
    startTransition(async () => {
      await markAsRead(notification.id);
      notifyNotificationsRead();
      router.refresh();
    });
  }

  const link = getLink();
  const message = getMessage();
  const timeAgo = notification.createdAt.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const content = (
    <div
      className={`flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 ${
        !notification.isRead ? 'bg-accent/30' : ''
      }`}
    >
      {notification.type === 'achievement_granted' ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
          <HiTrophy className="h-5 w-5" />
        </div>
      ) : notification.type === 'benefit_grant' ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
          <HiGift className="h-5 w-5" />
        </div>
      ) : notification.type === 'announcement' ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
          <HiMegaphone className="h-5 w-5" />
        </div>
      ) : actor?.avatarUrl ? (
        <Image
          src={actor.avatarUrl}
          alt={actorName}
          width={40}
          height={40}
          className="rounded-full object-cover h-10 w-10 flex-shrink-0"
          unoptimized
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
          <span className="text-sm font-medium">
            {actorName ? actorName.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      {!notification.isRead && (
        <div className="flex-shrink-0 mt-1">
          <div className="h-2 w-2 rounded-full bg-link-primary" />
        </div>
      )}
    </div>
  );

  if (link) {
    return (
      <Link href={link} locale={locale} onClick={handleClick} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className="w-full text-left" onClick={handleClick}>
      {content}
    </button>
  );
}
