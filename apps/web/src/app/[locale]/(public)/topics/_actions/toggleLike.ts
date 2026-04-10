'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { db, topicPosts } from '@/lib/db';
import { toggleLikeForTarget } from '@/lib/db/like-actions';
import { createNotification } from '@/lib/notification';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/validations/uuid';

type ToggleLikeResult = { liked: boolean; likeCount: number } | { error: string };

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

  revalidatePath(`/${locale}/topics/${urlSegment}/${topicIdentifier}`);
  revalidatePath(`/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${postId}`);

  return {
    liked,
    likeCount,
  };
}
