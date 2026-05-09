'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { db, moderationActions, topicPosts, userGrants } from '@/lib/db';
import { validateModerationReason } from '@/lib/moderation/validate-reason';

import { requireAdmin } from '../../_lib/auth';
import { getClientIp } from './getClientIp';

export async function deletePostAdmin(postId: string, reason: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const reasonResult = validateModerationReason(reason);
  if ('error' in reasonResult) {
    return reasonResult;
  }
  const trimmedReason = reasonResult.trimmed;

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

    // Revoke any benefit grants triggered by this post — same semantics as
    // the user-initiated deletePost flow. Admin-removed content should not
    // continue to award the author ad-free time that was earned from that
    // specific post.
    await tx
      .update(userGrants)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(userGrants.sourceType, 'topic_post'),
          eq(userGrants.sourceId, postId),
          isNull(userGrants.revokedAt)
        )
      );

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

  // Invalidate grant cache so the affected user's ad_free state updates.
  revalidateTag('grant-status', { expire: 60 });

  revalidatePath('/admin/users');
  revalidatePath('/admin/topic_posts');

  return { success: true };
}
