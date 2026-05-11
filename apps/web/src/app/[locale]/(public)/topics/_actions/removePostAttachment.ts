'use server';

import { revalidatePath } from 'next/cache';

import { and, eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import {
  db,
  postFenAttachments,
  postGameEmbedAttachments,
  postGamePgnAttachments,
  postImageAttachments,
  postVideoAttachments,
  topicPosts,
} from '@/lib/db';
import { POST_IMAGES_BUCKET } from '@/lib/post-images/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createClient as createSupabaseSessionClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';

import { buildTopicDetailPath } from '../_lib/topic-paths';

export type AttachmentKind = 'pgn' | 'fen' | 'image' | 'video' | 'embed';

export type RemovePostAttachmentResult = { success: true } | { error: string };

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
 * Not surfaced today: replacing an attachment (DELETE + INSERT). Phase 3.
 */
export async function removePostAttachment(
  postId: string,
  attachmentId: string,
  kind: AttachmentKind,
  locale: string
): Promise<RemovePostAttachmentResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.removePostAttachment);
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

  // For images, fetch the storage_path BEFORE the DELETE so the Storage
  // cleanup can target the right object. We do not chain the DELETE on
  // the storage call succeeding — the row in Postgres is the source of
  // truth and the reaper covers any survivors.
  let imageStoragePath: string | null = null;

  switch (kind) {
    case 'image': {
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
      break;
    }
    case 'pgn': {
      const result = await db
        .delete(postGamePgnAttachments)
        .where(
          and(
            eq(postGamePgnAttachments.id, attachmentId),
            eq(postGamePgnAttachments.postId, post.id)
          )
        )
        .returning({ id: postGamePgnAttachments.id });
      if (result.length === 0) return { error: 'attachmentNotFound' };
      break;
    }
    case 'fen': {
      const result = await db
        .delete(postFenAttachments)
        .where(and(eq(postFenAttachments.id, attachmentId), eq(postFenAttachments.postId, post.id)))
        .returning({ id: postFenAttachments.id });
      if (result.length === 0) return { error: 'attachmentNotFound' };
      break;
    }
    case 'video': {
      const result = await db
        .delete(postVideoAttachments)
        .where(
          and(eq(postVideoAttachments.id, attachmentId), eq(postVideoAttachments.postId, post.id))
        )
        .returning({ id: postVideoAttachments.id });
      if (result.length === 0) return { error: 'attachmentNotFound' };
      break;
    }
    case 'embed': {
      const result = await db
        .delete(postGameEmbedAttachments)
        .where(
          and(
            eq(postGameEmbedAttachments.id, attachmentId),
            eq(postGameEmbedAttachments.postId, post.id)
          )
        )
        .returning({ id: postGameEmbedAttachments.id });
      if (result.length === 0) return { error: 'attachmentNotFound' };
      break;
    }
    default: {
      const _exhaustive: never = kind;
      void _exhaustive;
      return { error: 'unsupportedKind' };
    }
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

  revalidatePath(buildTopicDetailPath(post.topicType, post.topicKey, locale));

  return { success: true };
}
