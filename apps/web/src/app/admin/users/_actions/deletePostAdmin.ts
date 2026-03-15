'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { db, moderationActions, topicPosts } from '@/lib/db';

import { requireAdmin } from '../../_lib/auth';
import { getClientIp } from './getClientIp';

type DeletePostAdminResult = { success: true } | { error: string };

export async function deletePostAdmin(
  postId: string,
  reason: string
): Promise<DeletePostAdminResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: 'reasonRequired' };
  }

  if (trimmedReason.length > 1000) {
    return { error: 'reasonTooLong' };
  }

  const [post] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      topicType: topicPosts.topicType,
      topicKey: topicPosts.topicKey,
      content: topicPosts.content,
    })
    .from(topicPosts)
    .where(eq(topicPosts.id, postId))
    .limit(1);

  if (!post) {
    return { error: 'notFound' };
  }

  const ipAddress = await getClientIp();

  await db.transaction(async (tx) => {
    await tx.update(topicPosts).set({ deletedAt: new Date() }).where(eq(topicPosts.id, postId));

    await tx.insert(moderationActions).values({
      actorId: auth.userId,
      action: 'delete_post',
      targetType: 'topic_post',
      targetId: postId,
      reason: trimmedReason,
      metadata: {
        content: post.content,
        topicType: post.topicType,
        topicKey: post.topicKey,
        authorId: post.userId,
      },
      ipAddress,
    });
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin/topic_posts');

  return { success: true };
}
