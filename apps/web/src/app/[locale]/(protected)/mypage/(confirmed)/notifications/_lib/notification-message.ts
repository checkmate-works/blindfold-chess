import { getAchievementDisplayName } from '@/lib/achievements/display';
import { truncateContent } from '@/lib/content/truncate-content';

import type { NotificationWithActor } from './queries';
import {
  getPositionTypeFromMetadata,
  isAchievementGrantedMetadata,
  isAnnouncementMetadata,
  isBenefitGrantMetadata,
  isLikeCoinGrantMetadata,
  isPointGrantMetadata,
  isPositionForkedMetadata,
  isPositionMetadata,
  isRankGrantMetadata,
} from './type-guards';

/** Minimal subset of the next-intl translator API used by message building. */
type MessageTranslator = {
  (key: string, values?: Record<string, string | number | Date>): string;
  has: (key: string) => boolean;
};

/** Root-scoped translator (no namespace) used for achievement display names. */
type RootTranslator = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Resolve the human-readable message for a notification. Pure given the
 * notification, the resolved actor name, and the (injected) translators —
 * extracted from `NotificationItem` so the message switch can be reasoned
 * about and tested independently of rendering.
 */
export function buildNotificationMessage(
  notification: NotificationWithActor,
  opts: { actorName: string; t: MessageTranslator; tRoot: RootTranslator }
): string {
  const { actorName, t, tRoot } = opts;

  switch (notification.type) {
    case 'follow':
      return t('followMessage', { actor: actorName });
    case 'like':
      // A shared game liked as a whole reads "liked your game". Topic posts
      // and game comments are both rendered as comments in the UGC UI, so
      // those read "liked your comment". Other likeable targets (positions)
      // keep the generic wording.
      if (notification.targetType === 'game') {
        return t('likeGameMessage', { actor: actorName });
      }
      if (notification.targetType === 'game_comment' || notification.targetType === 'topic_post') {
        return t('likeCommentMessage', { actor: actorName });
      }
      return t('likeMessage', { actor: actorName });
    case 'reply':
      return t('replyMessage', { actor: actorName });
    case 'new_post':
      return t('newPostMessage', { actor: actorName });
    case 'new_comment_on_topic':
      // A comment on your shared game reads "commented on your game";
      // every other surface (topic posts, positions, chunks, repertoires)
      // keeps the generic "commented on your post".
      if (notification.targetType === 'game_comment') {
        return t('newCommentOnGameMessage', { actor: actorName });
      }
      return t('newCommentOnTopicMessage', { actor: actorName });
    case 'chunk_edit_request_submitted':
      return t('chunkEditRequestSubmittedMessage', { actor: actorName });
    case 'chunk_edit_request_accepted':
      return t('chunkEditRequestAcceptedMessage', { actor: actorName });
    case 'position_edit_request_submitted':
      return t('positionEditRequestSubmittedMessage', { actor: actorName });
    case 'position_edit_request_accepted':
      return t('positionEditRequestAcceptedMessage', { actor: actorName });
    case 'new_chunk_draft':
      return t('newChunkDraftMessage', { actor: actorName });
    case 'chunk_published':
      return t('chunkPublishedMessage', { actor: actorName });
    case 'new_game':
      return t('newGameMessage', { actor: actorName });
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
    case 'puzzle_forked':
      // Distinguish the cross-type "Create Puzzle from here" action
      // (source was a position-memory entry) from a same-type puzzle
      // fork — "created a puzzle from your position" reads oddly for the
      // latter, where "forked your puzzle" matches the existing Fork
      // action's own vocabulary.
      if (
        isPositionForkedMetadata(notification.metadata) &&
        notification.metadata.sourceType === 'memory'
      ) {
        return t('puzzleCreatedFromPositionMessage', { actor: actorName });
      }
      return t('puzzleForkedMessage', { actor: actorName });
    case 'memory_forked':
      // Position-memory entries only accept a memory-type fork source
      // (see `POSITION_FORK_SOURCE_TYPES`), so unlike `puzzle_forked` there
      // is no cross-type wording to branch on here.
      return t('memoryForkedMessage', { actor: actorName });
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
        // Lookup order: benefitType+grantType (most specific) →
        // benefitType default → unknownNotification. Falling back to a
        // generic "ad-free benefit" string is deliberately avoided so
        // that adding a new benefitType forces an explicit i18n entry
        // instead of silently showing the wrong benefit name.
        const { benefitType, grantType, durationDays } = notification.metadata;
        const specificKey = `benefitGrantMessage.${benefitType}.${grantType}`;
        if (t.has(specificKey)) {
          return t(specificKey, { days: durationDays });
        }
        const benefitDefaultKey = `benefitGrantMessage.${benefitType}.default`;
        if (t.has(benefitDefaultKey)) {
          return t(benefitDefaultKey, { days: durationDays });
        }
        return t('unknownNotification');
      }
      return t('unknownNotification');
    case 'rank_grant':
      if (isRankGrantMetadata(notification.metadata)) {
        // The admin's reason is required at grant time (see grantRank),
        // so this is always present in practice; the rank-name fallback
        // only guards against malformed/legacy data.
        if (notification.metadata.reason) {
          return notification.metadata.reason;
        }
        return t('rankGrantMessage.default', {
          rankName: tRoot(`ranks.rankNames.${notification.metadata.rankSlug}`),
        });
      }
      return t('unknownNotification');
    case 'point_grant':
      if (isPointGrantMetadata(notification.metadata)) {
        // Surface the admin's free-form memo verbatim when it exists —
        // it is almost always more informative than the generic
        // "you received N points" fallback (e.g., "Compensation for
        // outage 2026-05-12").
        if (notification.metadata.reason) {
          return notification.metadata.reason;
        }
        return t('pointGrantMessage.default', { amount: notification.metadata.amount });
      }
      return t('unknownNotification');
    case 'like_coin_grant':
      if (isLikeCoinGrantMetadata(notification.metadata)) {
        return t('likeCoinGrantMessage.default', { count: notification.metadata.count });
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
