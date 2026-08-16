'use server';

import { and, eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import {
  db,
  postFenAttachments,
  postGameEmbedAttachments,
  postGamePgnAttachments,
  postImageAttachments,
  postVideoAttachments,
} from '@/lib/db';
import { POST_IMAGES_BUCKET } from '@/lib/post-images/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createClient as createSupabaseSessionClient } from '@/lib/supabase/server';
import { loadAuthoredPost } from '@/lib/topic-posts';
import { logActivityEvent } from '@/lib/users/activity-log';

export type AttachmentKind = 'pgn' | 'fen' | 'image' | 'video' | 'embed';

export type RemovePostAttachmentResult = { success: true } | { error: string };

/**
 * Drizzle table reference per attachment kind that follows the 1:0..1
 * invariant on `(post_id)`. All four expose `id` and `postId` columns
 * via Drizzle's `$inferSelect` shape, so the polymorphic DELETE below
 * can reduce to a single `(id, post_id)`-scoped delete keyed by table
 * — eliminating the per-kind switch arm.
 *
 * `image` is intentionally excluded: it is 1:N (up to 3 per post) AND
 * requires a pre-DELETE `storage_path` lookup plus a post-DELETE
 * Storage cleanup, neither of which the 1:0..1 kinds need. Its branch
 * stays inline in the action body.
 */
const TABLE_BY_1_TO_0_OR_1_KIND = {
  pgn: postGamePgnAttachments,
  fen: postFenAttachments,
  video: postVideoAttachments,
  embed: postGameEmbedAttachments,
} as const satisfies Record<Exclude<AttachmentKind, 'image'>, unknown>;

/**
 * Author-only delete of a single attachment row off one of their own
 * `topic_posts`. Polymorphic by `kind`; the action picks the matching
 * attachment table and deletes the row whose (id, post_id) pair matches
 * the supplied attachment id under the verified author's post.
 *
 *   - `pgn` / `fen` / `video` / `embed` — straight DELETE off the
 *     respective `post_*_attachments` table. The 1:0..1 invariant on each
 *     of these tables means there is at most one row per post, but the
 *     action still constrains by `(id, post_id)` so a hand-crafted call
 *     with a wrong attachment id cannot delete the wrong row.
 *   - `image` — DELETE off `post_image_attachments` PLUS best-effort
 *     `storage.from('post-images').remove([storage_path])`. The Storage
 *     remove is best-effort because Postgres is the source of truth: the
 *     row is gone whether or not the Storage bytes vanish, and the daily
 *     reaper (`lib/post-images/reap-orphaned-images.ts`) sweeps survivors
 *     within 7 days. Mirrors `deletePost`'s storage-cleanup posture.
 *
 * The image-count trigger on `post_image_attachments` keeps
 * `topic_posts.image_attachment_count` consistent automatically when the
 * row is deleted, so this action does not touch the counter directly.
 *
 * Not surfaced today: replacing an attachment (DELETE + INSERT).
 */
export async function removePostAttachment(
  postId: string,
  attachmentId: string,
  kind: AttachmentKind,
  // Positional slot kept for the shared action signature; unused.
  _locale: string
): Promise<RemovePostAttachmentResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.removePostAttachment);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const lookup = await loadAuthoredPost(postId, user.id);
  if ('error' in lookup) {
    return { error: lookup.error };
  }
  const { post } = lookup;

  // For images, fetch the storage_path BEFORE the DELETE so the Storage
  // cleanup can target the right object. We do not chain the DELETE on
  // the storage call succeeding — the row in Postgres is the source of
  // truth and the reaper covers any survivors.
  let imageStoragePath: string | null = null;

  if (kind === 'image') {
    const [row] = await db
      .select({ storagePath: postImageAttachments.storagePath })
      .from(postImageAttachments)
      .where(
        and(eq(postImageAttachments.id, attachmentId), eq(postImageAttachments.postId, post.id))
      )
      .limit(1);
    if (!row) return { error: 'attachmentNotFound' };
    imageStoragePath = row.storagePath;

    await db
      .delete(postImageAttachments)
      .where(
        and(eq(postImageAttachments.id, attachmentId), eq(postImageAttachments.postId, post.id))
      );
  } else {
    // 1:0..1 kinds share the same `(id, post_id)`-scoped DELETE + RETURNING
    // shape — the table reference is the only thing that differs. Looking
    // the table up by kind keeps each branch one line.
    const table = TABLE_BY_1_TO_0_OR_1_KIND[kind];
    const result = await db
      .delete(table)
      .where(and(eq(table.id, attachmentId), eq(table.postId, post.id)))
      .returning({ id: table.id });
    if (result.length === 0) return { error: 'attachmentNotFound' };
  }

  if (kind === 'image' && imageStoragePath) {
    // Best-effort: storage failure must not roll back the DB DELETE. The
    // daily reaper sweeps survivors within 7 days.
    try {
      const supabase = await createSupabaseSessionClient();
      const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).remove([imageStoragePath]);
      if (error) {
        console.warn('removePostAttachment: storage remove returned error', {
          postId,
          attachmentId,
          message: error.message,
        });
      }
    } catch (err) {
      console.warn('removePostAttachment: storage remove threw', {
        postId,
        attachmentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logActivityEvent({
    userId: user.id,
    action: 'remove_post_attachment',
    targetType: 'topic_post',
    targetId: postId,
    metadata: {
      topicType: post.topicType,
      topicKey: post.topicKey,
      attachmentKind: kind,
      attachmentId,
    },
  });

  return { success: true };
}
