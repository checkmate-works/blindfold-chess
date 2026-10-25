'use server';

import { and, eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
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
import { createAdminClient } from '@/lib/supabase/admin';
import { loadAuthoredPost } from '@/lib/topic-posts';
import { logActivityEvent } from '@/lib/users/activity-log';

export type AttachmentKind = 'pgn' | 'fen' | 'image' | 'video' | 'embed';

export type RemovePostAttachmentResult = ActionResult;

/**
 * Drizzle table reference per attachment kind that follows the 1:0..1
 * invariant on `(post_id)`. All four expose `id` and `postId` columns
 * via Drizzle's `$inferSelect` shape, so the polymorphic DELETE below
 * can reduce to a single `(id, post_id)`-scoped delete keyed by table
 * — eliminating the per-kind switch arm.
 *
 * `image` is intentionally excluded: it is 1:N (up to 3 per post) AND
 * requires a `storage_path` lookup and successful Storage cleanup
 * before deleting the database row, neither of which the 1:0..1 kinds need. Its branch
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
 *   - `image` — remove the Storage object before deleting its database row.
 *     On failure, retain the row and return an error so the author can retry.
 *     The service-role client is used only after checking post ownership and
 *     resolving the attachment path from that post's database row. This also
 *     makes retries safe if Storage succeeded but the DB delete failed.
 *     A session client can silently remove nothing once the SELECT policy's
 *     attachment-row prerequisite disappears; public URLs bypass that policy.
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

  if (kind === 'image') {
    const [row] = await db
      .select({ storagePath: postImageAttachments.storagePath })
      .from(postImageAttachments)
      .where(
        and(eq(postImageAttachments.id, attachmentId), eq(postImageAttachments.postId, post.id))
      )
      .limit(1);
    if (!row) return { error: 'attachmentNotFound' };
    // Keep the DB row until Storage confirms removal. It is both the
    // retry handle and the source of the path; never accept a client path.
    try {
      const { error } = await createAdminClient()
        .storage.from(POST_IMAGES_BUCKET)
        .remove([row.storagePath]);
      if (error) return { error: 'error' };
    } catch {
      return { error: 'error' };
    }

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
