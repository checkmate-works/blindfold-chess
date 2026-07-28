'use server';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import { eq } from 'drizzle-orm';

import { authenticateGuardAndRequireProfile } from '@/lib/auth';
import { db, topicPosts } from '@/lib/db';
import { toggleLikeForTarget } from '@/lib/db/like-actions';
import { isBlockedBetween } from '@/lib/moderation/block';
import { createNotification } from '@/lib/notifications/notification';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateUUID } from '@/lib/validations/uuid';

import type { TopicType } from '../_lib/constants';

type ToggleLikeResult = { liked: boolean; likeCount: number } | { error: string };

/**
 * Shared "like / unlike a topic_post" core, behind a thin `"use server"`
 * wrapper per topic type (squares, openings, chunks, repertoires, puzzle,
 * position-memory, ...).
 *
 * @design No `revalidatePath` — deliberate, do not re-add.
 * See the matching note on `performEntityToggleLike` in
 * `@/lib/db/like-actions` for the full rationale and the measurement. In
 * short: every page that renders a like count is uncached, so revalidation
 * changed nothing on screen, while forcing Next.js to re-render and ship the
 * caller's entire current page (256 KB on the home feed) with each like.
 * Removing it also removed this helper's `urlSegment` parameter, which
 * existed solely to build the default revalidate paths.
 */
export async function toggleLikeBase(params: {
  postId: string;
  locale: string;
  topicIdentifier: string;
  topicType: TopicType;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
}): Promise<ToggleLikeResult> {
  const { postId, locale, topicIdentifier, topicType, validateTopic } = params;

  assertSupportedLocale(locale);

  const uuidError = validateUUID(postId, 'postId');
  if (uuidError) return uuidError;

  if (!(await validateTopic(topicIdentifier))) {
    return { error: `invalid${topicType.charAt(0).toUpperCase()}${topicType.slice(1)}` };
  }

  const guardResult = await authenticateGuardAndRequireProfile(RATE_LIMITS.toggleLike);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  // Look up the author before toggling so a block can reject the like outright.
  const [post] = await db
    .select({ userId: topicPosts.userId })
    .from(topicPosts)
    .where(eq(topicPosts.id, postId))
    .limit(1);

  if (post?.userId && post.userId !== user.id && (await isBlockedBetween(user.id, post.userId))) {
    return { error: 'moderation.blocked' };
  }

  const { liked, likeCount } = await toggleLikeForTarget({
    userId: user.id,
    targetType: 'topic_post',
    targetId: postId,
  });

  // (createNotification no-ops when post.userId is null — anonymised author.)
  if (liked && post && post.userId !== user.id) {
    createNotification({
      userId: post.userId,
      actorId: user.id,
      type: 'like',
      targetType: 'topic_post',
      targetId: postId,
      metadata: { topicType, topicKey: topicIdentifier, postId },
    });
  }

  return {
    liked,
    likeCount,
  };
}
