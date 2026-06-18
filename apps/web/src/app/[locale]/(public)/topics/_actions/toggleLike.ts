'use server';

import { revalidatePath } from 'next/cache';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import { eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { db, topicPosts } from '@/lib/db';
import { toggleLikeForTarget } from '@/lib/db/like-actions';
import { createNotification } from '@/lib/notifications/notification';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateUUID } from '@/lib/validations/uuid';

import type { TopicType } from '../_lib/constants';

type ToggleLikeResult = { liked: boolean; likeCount: number } | { error: string };

export async function toggleLikeBase(params: {
  postId: string;
  locale: string;
  topicIdentifier: string;
  topicType: TopicType;
  urlSegment: string;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
  /**
   * Override the paths passed to `revalidatePath`. When omitted, defaults to
   * the legacy `/${locale}/topics/${urlSegment}/${topicIdentifier}` and
   * `/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${postId}` pair.
   */
  revalidate?: (postId: string) => string[];
}): Promise<ToggleLikeResult> {
  const { postId, locale, topicIdentifier, topicType, urlSegment, validateTopic, revalidate } =
    params;

  assertSupportedLocale(locale);

  const uuidError = validateUUID(postId, 'postId');
  if (uuidError) return uuidError;

  if (!(await validateTopic(topicIdentifier))) {
    return { error: `invalid${topicType.charAt(0).toUpperCase()}${topicType.slice(1)}` };
  }

  const guardResult = await authenticateAndGuard(RATE_LIMITS.toggleLike);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const { liked, likeCount } = await toggleLikeForTarget({
    userId: user.id,
    targetType: 'topic_post',
    targetId: postId,
  });

  if (liked) {
    const [post] = await db
      .select({ userId: topicPosts.userId })
      .from(topicPosts)
      .where(eq(topicPosts.id, postId))
      .limit(1);

    // Skip when the post author was anonymised (user_id NULL — account purged).
    if (post && post.userId && post.userId !== user.id) {
      createNotification({
        userId: post.userId,
        actorId: user.id,
        type: 'like',
        targetType: 'topic_post',
        targetId: postId,
        metadata: { topicType, topicKey: topicIdentifier, postId },
      });
    }
  }

  const pathsToRevalidate = revalidate
    ? revalidate(postId)
    : [
        `/${locale}/topics/${urlSegment}/${topicIdentifier}`,
        `/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${postId}`,
      ];
  for (const path of pathsToRevalidate) {
    revalidatePath(path);
  }

  return {
    liked,
    likeCount,
  };
}
