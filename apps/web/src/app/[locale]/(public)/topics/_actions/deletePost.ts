'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { logActivityEvent } from '@/lib/activity-log';
import { authenticateAndGuard } from '@/lib/auth';
import { db, topicPosts } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/rate-limit';

export type DeletePostResult = ActionResult;

const TOPIC_TYPE_TO_URL_SEGMENT: Record<string, string> = {
  square: 'squares',
  opening: 'openings',
};

export async function deletePost(postId: string, locale: string): Promise<DeletePostResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.deletePost);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const [post] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      topicType: topicPosts.topicType,
      topicKey: topicPosts.topicKey,
      deletedAt: topicPosts.deletedAt,
    })
    .from(topicPosts)
    .where(eq(topicPosts.id, postId))
    .limit(1);

  if (!post) {
    return { error: 'notFound' };
  }

  if (post.userId !== user.id) {
    return { error: 'unauthorized' };
  }

  if (post.deletedAt) {
    return { error: 'alreadyDeleted' };
  }

  await db
    .update(topicPosts)
    .set({ deletedAt: new Date() })
    .where(and(eq(topicPosts.id, postId), isNull(topicPosts.deletedAt)));

  logActivityEvent({
    userId: user.id,
    action: 'delete_post',
    targetType: 'topic_post',
    targetId: postId,
    metadata: { topicType: post.topicType, topicKey: post.topicKey },
  });

  const urlSegment = TOPIC_TYPE_TO_URL_SEGMENT[post.topicType] ?? post.topicType;
  revalidatePath(`/${locale}/topics/${urlSegment}/${post.topicKey}`);

  return { success: true };
}
