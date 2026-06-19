import { and, eq, inArray, isNotNull, lt } from 'drizzle-orm';
import 'server-only';

import { db, postImageAttachments, topicPosts } from '@/lib/db';
import { startRetentionRun } from '@/lib/retention-run';
import { createAdminClient } from '@/lib/supabase/admin';

import { POST_IMAGES_BUCKET } from './validation';

/**
 * Reaper for orphaned post-image storage objects.
 *
 * @description
 * The user-facing flow ("delete post → best-effort storage remove") is the
 * happy path. This function is the catch-net for the case that escapes it:
 *
 *   - Storage remove failed (transient network, transient Supabase
 *     outage, etc.). The post row gets soft-deleted but the bytes stay.
 *
 * Strategy (Phase A — currently the only implemented phase):
 *   Find every `post_image_attachments` row whose parent post has been
 *   soft-deleted for longer than `REAP_RETENTION_MS`, remove the bytes
 *   from Storage in batches, then hard-delete the attachment rows.
 *
 * The function returns a summary so the cron route can log / surface
 * counts. It tolerates partial failures: each batch is best-effort and
 * non-fatal. If the storage remove fails for a batch, the matching DB
 * rows are intentionally left in place so the next run retries.
 *
 * @design Why service-role (admin) client
 *
 * The reaper runs on a Vercel Cron schedule (no user session) and needs
 * to delete bytes belonging to many users. It bypasses RLS by design —
 * the cron route is gated by `CRON_SECRET`, not by per-user auth.
 *
 * @design Phase A scope and Phase B status
 *
 * "Phase A" covers the only orphan source we can identify with a single
 * indexed JOIN: attachments whose parent post has been soft-deleted for
 * longer than the retention window. The hard-delete + FK-CASCADE path
 * already removes attachment rows synchronously, so admin hard-deletes
 * do NOT produce orphan rows here.
 *
 * "Phase B" — orphaned Storage keys with NO matching DB row (e.g. a
 * user uploaded an image and then abandoned the form before saving the
 * post) — is NOT yet implemented. See the `TODO(#73-phase-b)` marker
 * inside the function body for the design sketch.
 */

/**
 * Posts that have been soft-deleted longer than this window are eligible
 * for reaping (along with their attachment rows). 7 days matches the
 * disclosure copy on the post-creation form / ToS.
 */
export const REAP_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const STORAGE_REMOVE_BATCH_SIZE = 100;

export type ReaperReport = {
  reapedAttachmentRows: number;
  reapedStorageObjects: number;
  errors: number;
  startedAt: string;
  finishedAt: string;
};

export async function reapOrphanedPostImages(now: Date = new Date()): Promise<ReaperReport> {
  const run = startRetentionRun({ now, retentionMs: REAP_RETENTION_MS });
  let reapedAttachmentRows = 0;
  let reapedStorageObjects = 0;
  let errors = 0;

  const admin = createAdminClient();

  // ---- Phase A: post soft-deleted long enough → reap attachment rows + bytes
  //
  // Single indexed query. The composite predicate
  //   parent.deleted_at IS NOT NULL AND parent.deleted_at < cutoff
  // reuses the soft-delete index on topic_posts.deleted_at, and we project
  // (attachmentId, storagePath) directly so there is no second round-trip
  // and no in-JS post-filter loop. This avoids unbounded memory growth as
  // the soft-deleted set grows and removes the previous subtle correctness
  // gap (the old `OR` predicate matched any non-null deleted_at, including
  // posts soft-deleted only minutes ago).
  //
  // Anonymised-but-retained posts are intentionally NOT reaped: when an author
  // deletes their account, their public posts survive with `user_id = NULL` but
  // `deleted_at` stays NULL (the post is anonymised, not tombstoned — see the
  // SET NULL FK on `topic_posts.user_id`). Because this predicate keys off
  // `deleted_at IS NOT NULL`, such posts — and their image attachments — fall
  // outside the reaper, so the attachments are preserved with the post.
  //
  // TODO(#73-phase-b): iterate the `post-images` bucket via
  // `admin.storage.from(POST_IMAGES_BUCKET).list(prefix, { limit, offset })`,
  // batch the discovered keys, and reap any key that has no matching
  // `post_image_attachments.storage_path`. This catches Storage objects
  // uploaded by users who abandoned the form before saving the post (no
  // DB row was ever inserted). Currently this reaper only handles Phase
  // A (parents soft-deleted >= REAP_RETENTION_MS).
  const phaseATargets = await db
    .select({
      attachmentId: postImageAttachments.id,
      storagePath: postImageAttachments.storagePath,
    })
    .from(postImageAttachments)
    .innerJoin(topicPosts, eq(topicPosts.id, postImageAttachments.postId))
    .where(and(isNotNull(topicPosts.deletedAt), lt(topicPosts.deletedAt, run.cutoff)));

  if (phaseATargets.length > 0) {
    // Remove storage objects in batches.
    for (let i = 0; i < phaseATargets.length; i += STORAGE_REMOVE_BATCH_SIZE) {
      const batch = phaseATargets.slice(i, i + STORAGE_REMOVE_BATCH_SIZE);
      const { error } = await admin.storage
        .from(POST_IMAGES_BUCKET)
        .remove(batch.map((b) => b.storagePath));
      if (error) {
        console.warn('reapOrphanedPostImages: storage remove batch error', {
          phase: 'A',
          batchSize: batch.length,
          message: error.message,
        });
        errors += 1;
        // Don't delete the DB rows for this batch — let the next run retry.
        continue;
      }
      reapedStorageObjects += batch.length;
      // Hard-delete the now-orphaned attachment rows.
      try {
        await db.delete(postImageAttachments).where(
          inArray(
            postImageAttachments.id,
            batch.map((b) => b.attachmentId)
          )
        );
        reapedAttachmentRows += batch.length;
      } catch (err) {
        console.warn('reapOrphanedPostImages: db delete batch error', {
          phase: 'A',
          batchSize: batch.length,
          error: err instanceof Error ? err.message : String(err),
        });
        errors += 1;
      }
    }
  }

  return {
    reapedAttachmentRows,
    reapedStorageObjects,
    errors,
    ...run.stamps(),
  };
}
