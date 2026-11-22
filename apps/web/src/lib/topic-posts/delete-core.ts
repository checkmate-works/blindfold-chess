import { revalidateTag } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import { TOPIC_POST_COUNTS_CACHE_TAG, grantStatusTag } from '@/lib/cache-tags';
import { db, postImageAttachments, topicPosts, userGrants } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import {
  type StorageBucketClient,
  removePostImagesBestEffort,
} from '@/lib/post-images/remove-best-effort';

/**
 * Best-effort cleanup of every Storage object backing a post's image
 * attachments. The attachment rows stay (no hard delete) — only the bytes
 * in the bucket are reaped here. Failures are logged but do not block
 * deletion: the daily reaper
 * (`apps/web/src/lib/post-images/reap-orphaned-images.ts`) sweeps
 * anything that survives within 7 days.
 *
 * Exported so both the user-initiated `deletePost` and the moderator
 * `deletePostAdmin` can run the same cleanup with their respective
 * supabase clients (session vs. service-role; RLS blocks the admin path
 * from using the session client).
 */
export async function purgePostImageAttachmentsFromStorage(
  postId: string,
  storageClient: StorageBucketClient,
  logPrefix: string
): Promise<void> {
  const imageRows = await db
    .select({ storagePath: postImageAttachments.storagePath })
    .from(postImageAttachments)
    .where(eq(postImageAttachments.postId, postId));

  if (imageRows.length === 0) return;

  await removePostImagesBestEffort(
    storageClient,
    imageRows.map((r) => r.storagePath),
    logPrefix,
    { postId }
  );
}

/**
 * The transactional core shared by user-initiated and admin-initiated
 * post deletion. Soft-deletes the `topic_posts` row and revokes any legacy
 * `user_grants` rows the post triggered.
 *
 * Caller responsibilities (NOT done here, because they diverge between
 * user and admin paths):
 *   - Authentication / authorisation
 *   - The Storage object cleanup (call
 *     {@link purgePostImageAttachmentsFromStorage} before this in the
 *     same flow)
 *   - Activity log (`logActivityEvent`) on the user path
 *   - Moderation action insert on the admin path
 *   - Path-level `revalidatePath` for whichever surfaces the caller wants
 *     to refresh (the user path revalidates the topic detail; the admin
 *     path revalidates the admin tables)
 *
 * @param postId The post being deleted. Used as both the soft-delete
 *   target and the source for `userGrants` revocation.
 * @param authorUserId The post's author, whose cached grant status is
 *   invalidated. On the user path this is `user.id`; on the admin path it is
 *   the post's own `userId`, NOT the admin actor. `null` when the author was
 *   anonymised (account purged) — there is no grant status left to refresh.
 * @param options.requireNotDeleted When `true`, the soft-delete is
 *   gated on `deletedAt IS NULL`, so a re-delete is a no-op. The user
 *   path sets this to preserve idempotency; the admin path leaves it
 *   off because moderators may re-delete to update audit context (the
 *   `moderation_actions` insert is what changes on a re-run).
 * @param options.insideTransaction Optional callback run inside the
 *   same DB transaction as the soft-delete / grants revoke.
 *   The admin path uses this to write its `moderation_actions` audit
 *   row atomically with the deletion — preserving the original
 *   single-transaction semantics this function was extracted from.
 */
export async function deletePostCore(
  postId: string,
  authorUserId: string | null,
  options: { requireNotDeleted: boolean; insideTransaction?: (tx: DbTx) => Promise<void> }
): Promise<void> {
  await db.transaction(async (tx: DbTx) => {
    if (options.requireNotDeleted) {
      await tx
        .update(topicPosts)
        .set({ deletedAt: new Date() })
        .where(and(eq(topicPosts.id, postId), isNull(topicPosts.deletedAt)));
    } else {
      await tx.update(topicPosts).set({ deletedAt: new Date() }).where(eq(topicPosts.id, postId));
    }

    // Revoke any legacy benefit grants triggered by this post. New posts
    // no longer create user_grants directly (the point system superseded
    // that path), but rows from before the migration still exist and
    // need revocation. After all legacy grants expire (~5 days
    // post-cutover), this can be removed.
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

    if (options.insideTransaction) {
      await options.insideTransaction(tx);
    }
  });

  // Invalidate grant cache so the affected user's ad_free state updates
  // immediately. Outside the transaction because Next.js' revalidate APIs
  // observe the writes — calling them inside would still work but adds
  // no atomicity guarantee.
  if (authorUserId) {
    revalidateTag(grantStatusTag(authorUserId), { expire: 60 });
  }
  // The topic index pages paginate against cached top-level COUNTs; a
  // removed post must drop out of the denominator at once, or the last
  // page shows an empty slot. Fires for replies too, harmlessly.
  revalidateTag(TOPIC_POST_COUNTS_CACHE_TAG, { expire: 0 });
}
