'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, postImageAttachments, topicPosts, userGrants } from '@/lib/db';
import { POST_IMAGES_BUCKET } from '@/lib/post-images/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createClient as createSupabaseSessionClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';

import { buildTopicDetailPath } from '../_lib/topic-paths';

export type DeletePostResult = ActionResult;

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

  // Best-effort: remove any image attachment Storage objects BEFORE the
  // soft delete. The post row stays (soft delete) and the attachment rows
  // stay (no hard delete); only the bytes in the bucket are reaped here.
  // Failures are logged but do not block the soft delete — the daily
  // reaper (apps/web/src/lib/post-images/reap-orphaned-images.ts) sweeps
  // anything that survives this best-effort path within 7 days.
  const imageRows = await db
    .select({ storagePath: postImageAttachments.storagePath })
    .from(postImageAttachments)
    .where(eq(postImageAttachments.postId, postId));

  if (imageRows.length > 0) {
    try {
      const supabase = await createSupabaseSessionClient();
      const { error } = await supabase.storage
        .from(POST_IMAGES_BUCKET)
        .remove(imageRows.map((r) => r.storagePath));
      if (error) {
        console.warn('deletePost: storage remove returned error', {
          postId,
          message: error.message,
        });
      }
    } catch (err) {
      console.warn('deletePost: storage remove threw', {
        postId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(topicPosts)
      .set({ deletedAt: new Date() })
      .where(and(eq(topicPosts.id, postId), isNull(topicPosts.deletedAt)));

    // Revoke any legacy benefit grants triggered by this post. New posts no
    // longer create user_grants directly (the point system superseded that
    // path), but rows from before the migration still exist and need
    // revocation. After all legacy grants expire (~5 days post-cutover),
    // this can be removed.
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

    // No point clawback on user self-deletion — users keep the coins they
    // earned for their own contributions. Moderator removal does claw back
    // (see deletePostAdmin).
  });

  // Invalidate grant cache so the user's ad_free state updates immediately.
  revalidateTag('grant-status', { expire: 60 });

  logActivityEvent({
    userId: user.id,
    action: 'delete_post',
    targetType: 'topic_post',
    targetId: postId,
    metadata: { topicType: post.topicType, topicKey: post.topicKey },
  });

  revalidatePath(buildTopicDetailPath(post.topicType, post.topicKey, locale));

  return { success: true };
}
