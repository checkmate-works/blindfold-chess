'use server';

import { revalidatePath } from 'next/cache';

import { and, count, eq } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';
import { authenticateAndGuard } from '@/lib/auth';
import { db, topicPostLikes, topicPosts } from '@/lib/db';
import { toggleByInsert } from '@/lib/db/toggle-by-insert';
import { createNotification } from '@/lib/notification';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/validations/uuid';

export type ToggleLikeResult = { liked: boolean; likeCount: number } | { error: string };

export async function toggleLikeBase(params: {
  postId: string;
  locale: string;
  topicIdentifier: string;
  topicType: 'square' | 'opening';
  urlSegment: string;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
}): Promise<ToggleLikeResult> {
  const { postId, locale, topicIdentifier, topicType, urlSegment, validateTopic } = params;

  if (!UUID_RE.test(postId)) {
    return { error: 'invalidPostId' };
  }

  if (!(await validateTopic(topicIdentifier))) {
    return { error: `invalid${topicType.charAt(0).toUpperCase()}${topicType.slice(1)}` };
  }

  const guardResult = await authenticateAndGuard(RATE_LIMITS.toggleLike);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const liked = await toggleByInsert(
    () => db.insert(topicPostLikes).values({ userId: user.id, postId }),
    () =>
      db
        .delete(topicPostLikes)
        .where(and(eq(topicPostLikes.userId, user.id), eq(topicPostLikes.postId, postId)))
  );

  logActivityEvent({
    userId: user.id,
    action: liked ? 'like' : 'unlike',
    targetType: 'topic_post',
    targetId: postId,
  });

  if (liked) {
    const [post] = await db
      .select({ userId: topicPosts.userId })
      .from(topicPosts)
      .where(eq(topicPosts.id, postId))
      .limit(1);

    if (post && post.userId !== user.id) {
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

  const [result] = await db
    .select({ count: count() })
    .from(topicPostLikes)
    .where(eq(topicPostLikes.postId, postId));

  revalidatePath(`/${locale}/topics/${urlSegment}/${topicIdentifier}`);
  revalidatePath(`/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${postId}`);

  return {
    liked,
    likeCount: result.count,
  };
}
