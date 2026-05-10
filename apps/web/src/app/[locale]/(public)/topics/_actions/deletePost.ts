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

export type DeletePostResult = ActionResult;

const TOPIC_TYPE_TO_URL_SEGMENT: Record<string, string> = {
  square: 'squares',
  opening: 'openings',
  chunk: 'chunks',
  // Position-backed topic types live under `/practice/...`, not
  // `/topics/...`. The mapped segment is consumed by the legacy
  // `/topics/{segment}/{key}` builder which we override below for these
  // types — the entry is still present so cross-references that look up
  // the segment by topicType (e.g. analytics, activity log labels) get a
  // sensible value.
  position_memory: 'practice/position-memory',
  position_puzzle: 'practice/puzzle',
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

    // Revoke any benefit grants triggered by this post. The source* columns
    // on user_grants were added specifically to support this targeted
    // revocation flow — see schema.ts userGrants @design sourceType.
    // Note on stacking semantics: if the user had multiple stacked grants
    // and one is revoked, the others retain their pre-computed startsAt/
    // expiresAt. This may leave a "gap" in ad_free coverage rather than
    // shifting subsequent grants forward. Acceptable — revocation is
    // intentionally narrow to "grants earned from the deleted action".
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

  const urlSegment = TOPIC_TYPE_TO_URL_SEGMENT[post.topicType] ?? post.topicType;
  // 'chunk' lives at /chunks/{slug}, and `position_memory` / `position_puzzle`
  // live under /practice/{kind}/{id} — these topic types host comments via
  // topic_posts but are not segments of the /topics route tree.
  let detailPath: string;
  if (post.topicType === 'chunk') {
    detailPath = `/${locale}/chunks/${post.topicKey}`;
  } else if (post.topicType === 'position_memory') {
    detailPath = `/${locale}/practice/position-memory/${post.topicKey}`;
  } else if (post.topicType === 'position_puzzle') {
    detailPath = `/${locale}/practice/puzzle/${post.topicKey}`;
  } else {
    detailPath = `/${locale}/topics/${urlSegment}/${post.topicKey}`;
  }
  revalidatePath(detailPath);

  return { success: true };
}
