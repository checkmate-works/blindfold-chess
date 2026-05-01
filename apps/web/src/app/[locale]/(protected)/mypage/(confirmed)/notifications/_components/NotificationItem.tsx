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
import { truncateContent } from '@/lib/content/truncate-content';
import { getPositionDetailPath } from '@/lib/positions/routes';

import { markAsRead } from '../_actions';
import type { NotificationWithActor } from '../_lib/queries';
import type { PositionMetadata } from '../_lib/type-guards';
import {
  getPositionTypeFromMetadata,
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

/**
 * Resolve a notification link for a position-targeted notification.
 *
 * Uses the stored `positionType` in `metadata` to route to the correct
 * detail page (`/practice/puzzle/:id` for puzzles,
 * `/practice/position-memory/:id` for memory).
 *
 * Return values:
 *   - A path string — route to the correct detail page when `positionType`
 *     is known and a detail page exists.
 *   - `null` — `positionType` is a known value that has no detail page
 *     (currently `'sequence'`). Callers should degrade to a non-link
 *     button rather than producing an inevitable 404.
 *   - `/practice/position-memory/:id` fallback — `positionType` is missing
 *     (legacy notifications persisted before the field was introduced) or
 *     outside the known set. Legacy rows are overwhelmingly memory-typed,
 *     so the memory URL preserves pre-fix behavior.
 */
function resolvePositionLinkFromMetadata(id: string, metadata: PositionMetadata): string | null {
  const positionType = getPositionTypeFromMetadata(metadata);
  if (positionType !== null) {
    // Known type: trust `getPositionDetailPath`, including its `null` for
    // `sequence`. Do NOT fall back to the memory URL here — that would
    // just 404 for sequence positions.
    return getPositionDetailPath(positionType, id);
  }
  // Unknown / missing positionType — preserve legacy behavior.
  return `/practice/position-memory/${id}`;
}

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
      case 'new_comment_on_topic':
        return t('newCommentOnTopicMessage', { actor: actorName });
      case 'new_position': {
        // Exhaustive `PositionType` dispatch — the `never` check at the
        // bottom forces this switch to be updated whenever a new
        // `PositionType` value is introduced, instead of silently
        // falling through to the memory message.
        const positionType = isPositionMetadata(notification.metadata)
          ? getPositionTypeFromMetadata(notification.metadata)
          : null;
        if (positionType === null) {
          // Legacy notifications (no `positionType`) or unknown values.
          return t('newPositionMemoryMessage', { actor: actorName });
        }
        switch (positionType) {
          case 'puzzle':
            return t('newPuzzleMessage', { actor: actorName });
          case 'memory':
          case 'sequence':
            return t('newPositionMemoryMessage', { actor: actorName });
          default: {
            const _exhaustive: never = positionType;
            return _exhaustive;
          }
        }
      }
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
          const specificKey = `benefitGrantMessage.${notification.metadata.grantType}`;
          if (t.has(specificKey)) {
            return t(specificKey, { days: notification.metadata.durationDays });
          }
          return t('benefitGrantMessage.default', { days: notification.metadata.durationDays });
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

  /**
   * Build the post-detail URL for a notification keyed off `topicType`.
   *
   * `topic_posts` is polymorphic, but the routes that render those posts
   * are not:
   *   - `square` / `opening` → `/topics/{segment}/{key}/posts/{postId}` detail
   *     page; reply anchors use `#reply-{replyId}` because the detail page's
   *     `ReplyList` renders each reply with `id="reply-{id}"`.
   *   - `chunk` → `/chunks/{slug}/posts/{postId}` detail page; same reply
   *     anchor convention.
   *   - `position_memory` / `position_puzzle` → no detail page; the parent
   *     puzzle / position page renders a Reddit-style inline tree where every
   *     `CommentNode` has `id="post-{id}"`. Both top-level and reply
   *     notifications point at `parent#post-{targetId}` (replyId for replies,
   *     postId for top-level).
   */
  function buildPostDetailUrl(
    topicType: string,
    topicKey: string,
    postId: string,
    replyId?: string
  ): string {
    if (topicType === 'position_memory') {
      const targetId = replyId ?? postId;
      return `/practice/position-memory/${topicKey}#post-${targetId}`;
    }
    if (topicType === 'position_puzzle') {
      const targetId = replyId ?? postId;
      return `/practice/puzzle/${topicKey}#post-${targetId}`;
    }
    const segment = getTopicSegment(topicType);
    const baseUrl = `/topics/${segment}/${topicKey}/posts/${postId}`;
    return replyId ? `${baseUrl}#reply-${replyId}` : baseUrl;
  }

  function getLink(): string | null {
    if (notification.type === 'follow' && actor) {
      return `/u/${actor.username}`;
    }
    if (notification.type === 'like' && notification.targetType === 'position') {
      if (isPositionMetadata(notification.metadata)) {
        // Prefer the stored `positionType` so puzzle likes route to
        // `/practice/puzzle/:id` (the memory URL 404s for puzzles).
        // May return `null` for types without a detail page (e.g.
        // `sequence`); in that case the item degrades to a non-link
        // button rather than producing a 404. Legacy notifications
        // without `positionType` still fall back to the memory URL.
        return resolvePositionLinkFromMetadata(
          notification.metadata.positionId,
          notification.metadata
        );
      }
      if (notification.targetId) {
        return `/practice/position-memory/${notification.targetId}`;
      }
    }
    if (notification.type === 'new_position' && notification.targetId) {
      if (isPositionMetadata(notification.metadata)) {
        return resolvePositionLinkFromMetadata(notification.targetId, notification.metadata);
      }
      return `/practice/position-memory/${notification.targetId}`;
    }
    if (
      (notification.type === 'like' ||
        notification.type === 'reply' ||
        notification.type === 'new_post' ||
        notification.type === 'new_comment_on_topic') &&
      isPostMetadata(notification.metadata)
    ) {
      const replyId =
        notification.type === 'reply' && isReplyMetadata(notification.metadata)
          ? notification.metadata.replyId
          : undefined;
      return buildPostDetailUrl(
        notification.metadata.topicType,
        notification.metadata.topicKey,
        notification.metadata.postId,
        replyId
      );
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
