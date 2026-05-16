'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { db, moderationActions, postImageAttachments, topicPosts, userGrants } from '@/lib/db';
import { validateModerationReason } from '@/lib/moderation/validate-reason';
import { clawbackPointsForPost } from '@/lib/points';
import { POST_IMAGES_BUCKET } from '@/lib/post-images/validation';
import { createAdminClient } from '@/lib/supabase/admin';

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

  // Best-effort image-attachment Storage cleanup BEFORE soft-deleting the
  // post. Mirrors the user-side `deletePost` flow but uses the admin
  // client (admin is not the post owner; RLS would otherwise block the
  // remove). Failures are non-blocking — the daily reaper sweeps anything
  // that survives within 7 days.
  const imageRows = await db
    .select({ storagePath: postImageAttachments.storagePath })
    .from(postImageAttachments)
    .where(eq(postImageAttachments.postId, postId));

  if (imageRows.length > 0) {
    try {
      const admin = createAdminClient();
      const { error } = await admin.storage
        .from(POST_IMAGES_BUCKET)
        .remove(imageRows.map((r) => r.storagePath));
      if (error) {
        console.warn('deletePostAdmin: storage remove returned error', {
          postId,
          message: error.message,
        });
      }
    } catch (err) {
      console.warn('deletePostAdmin: storage remove threw', {
        postId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(topicPosts).set({ deletedAt: new Date() }).where(eq(topicPosts.id, postId));

    // Revoke any legacy ad_free grants triggered by this post — same
    // semantics as the user-initiated deletePost flow. New posts no longer
    // create user_grants directly (the point system superseded that path),
    // but pre-migration rows still need revocation.
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

    // Moderator removal claws back the post's point grant (against the
    // post's author, not the admin actor), capped at the author's current
    // balance. User self-deletion does NOT claw back.
    await clawbackPointsForPost(tx, post.userId, {
      type: 'topic_post',
      id: postId,
    });

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
