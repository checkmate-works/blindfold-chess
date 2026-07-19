'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { db, moderationActions, topicPosts } from '@/lib/db';
import { validateModerationReason } from '@/lib/moderation/validate-reason';
import { getClientIp } from '@/lib/security/client-ip';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  deletePostCore,
  purgePostImageAttachmentsFromStorage,
} from '@/lib/topic-posts/delete-core';

import { requireAdmin } from '../../_lib/auth';

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

  // Admin path uses the service-role client; RLS would otherwise block
  // the admin from removing storage objects owned by another user.
  await purgePostImageAttachmentsFromStorage(postId, createAdminClient(), 'deletePostAdmin');

  // `requireNotDeleted: false` — moderators may re-delete an
  // already-soft-deleted post to record a new `moderation_actions` entry
  // (e.g., updating the reason). The soft-delete update itself becomes a
  // no-op write in that case; the audit log written inside the same
  // transaction is what changes. Clawback is debited from the POST
  // AUTHOR, not the admin actor.
  await deletePostCore(postId, post.userId, {
    requireNotDeleted: false,
    insideTransaction: async (tx) => {
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
    },
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin/topic_posts');

  return { success: true };
}
