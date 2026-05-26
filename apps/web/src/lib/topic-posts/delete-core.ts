import { revalidateTag } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import { db, postImageAttachments, topicPosts, userGrants } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import { clawbackPointsForPost } from '@/lib/points';
import { POST_IMAGES_BUCKET } from '@/lib/post-images/validation';

/**
 * Minimal supabase-client surface this module needs. Captured as a
 * structural type so callers can pass either the user-scoped session
 * client or the admin (service-role) client without this file pulling in
 * either supabase factory directly.
 */
type StorageBucketClient = {
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
    };
  };
};

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

  try {
    const { error } = await storageClient.storage
      .from(POST_IMAGES_BUCKET)
      .remove(imageRows.map((r) => r.storagePath));
    if (error) {
      console.warn(`${logPrefix}: storage remove returned error`, {
        postId,
        message: error.message,
      });
    }
  } catch (err) {
    console.warn(`${logPrefix}: storage remove threw`, {
      postId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * The transactional core shared by user-initiated and admin-initiated
 * post deletion. Soft-deletes the `topic_posts` row, revokes any legacy
 * `user_grants` rows the post triggered, and claws back the post's point
 * grant from the post author (capped at the author's current balance, so
 * already-spent coins are not pursued and the balance never goes
 * negative).
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
 *   target and the source for `userGrants` revocation and the points
 *   clawback ledger entry.
 * @param authorUserId The user whose points balance the clawback is
 *   debited from. On the user path this is `user.id`; on the admin path
 *   it is the post's own `userId`, NOT the admin actor.
 * @param options.requireNotDeleted When `true`, the soft-delete is
 *   gated on `deletedAt IS NULL`, so a re-delete is a no-op. The user
 *   path sets this to preserve idempotency; the admin path leaves it
 *   off because moderators may re-delete to update audit context (the
 *   `moderation_actions` insert is what changes on a re-run).
 * @param options.insideTransaction Optional callback run inside the
 *   same DB transaction as the soft-delete / grants revoke / clawback.
 *   The admin path uses this to write its `moderation_actions` audit
 *   row atomically with the deletion — preserving the original
 *   single-transaction semantics this function was extracted from.
 */
export async function deletePostCore(
  postId: string,
  authorUserId: string,
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

    // Reverse the creation point grant for the removed post. Capped at
    // the author's current `earned` balance, so coins already spent are
    // not pursued — the balance never goes negative and self-deletion
    // never lands a user in debt. A no-op for posts that never earned
    // points (non point-eligible topic types).
    await clawbackPointsForPost(tx, authorUserId, { type: 'topic_post', id: postId });

    if (options.insideTransaction) {
      await options.insideTransaction(tx);
    }
  });

  // Invalidate grant cache so the affected user's ad_free state updates
  // immediately. Outside the transaction because Next.js' revalidate APIs
  // observe the writes — calling them inside would still work but adds
  // no atomicity guarantee.
  revalidateTag('grant-status', { expire: 60 });
}
