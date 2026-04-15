'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, topicPosts, userGrants } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

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
  revalidatePath(`/${locale}/topics/${urlSegment}/${post.topicKey}`);

  return { success: true };
}
