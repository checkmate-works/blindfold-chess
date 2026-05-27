'use server';

import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { db, topicPosts } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { loadAuthoredPost } from '@/lib/topic-posts';
import { logActivityEvent } from '@/lib/users/activity-log';
import { validateContent } from '@/lib/validations/content';

import { buildTopicDetailPath } from '../_lib/topic-paths';

export type EditPostResult =
  | { success: true; content: string; isSpoiler: boolean; updatedAt: Date }
  | { error: string };

/**
 * Edit a topic_post's text content (and, for `position_puzzle`, its spoiler
 * flag) in place. Author-only — the post owner is the sole party allowed to
 * rewrite their own comment. Mirrors `deletePost`'s polymorphic dispatch so
 * the same action serves every topic type that hosts `topic_posts`.
 *
 * Semantics intentionally narrow:
 *   - Soft-deleted posts cannot be edited (tombstones are final).
 *   - `replyPermission` is NOT editable here — it's a top-level-post knob
 *     hidden from end users today; surfacing it as edit-only would create
 *     an unintended write path.
 *   - Attachments (PGN/FEN/image/video/embed) are NOT touched. A later
 *     phase will add attachment editing once the storage/quota lifecycle
 *     can be reasoned about for the in-place edit path.
 *   - If neither content nor isSpoiler would change, the DB write is
 *     skipped so `updatedAt` does not advance — this keeps the "(edited)"
 *     indicator (derived from `updatedAt > createdAt`) honest.
 *
 * Returns the new server-side values on success so the optimistic UI in
 * CommentNode / the OP card can swap in the fresh content + updatedAt
 * without a round-trip.
 */
export async function editPost(
  postId: string,
  locale: string,
  formData: FormData
): Promise<EditPostResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.editPost);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const lookup = await loadAuthoredPost(postId, user.id);
  if ('error' in lookup) {
    return { error: lookup.error };
  }
  const { post } = lookup;

  const contentResult = validateContent(formData);
  if ('error' in contentResult) {
    return { error: contentResult.error };
  }

  // isSpoiler is only surfaced in the UI for `position_puzzle` today. Ignore
  // the field for every other topic type so a hand-crafted FormData cannot
  // flip the column on, say, an opening post.
  const nextIsSpoiler =
    post.topicType === 'position_puzzle' ? formData.get('isSpoiler') === 'on' : post.isSpoiler;

  const contentChanged = contentResult.content !== post.content;
  const spoilerChanged = nextIsSpoiler !== post.isSpoiler;

  if (!contentChanged && !spoilerChanged) {
    // No-op edit (user opened the form and saved without changes). Return
    // the existing values so the client doesn't show a stale "(edited)"
    // mark on a row whose `updatedAt` did not move.
    return {
      success: true,
      content: post.content,
      isSpoiler: post.isSpoiler,
      // Re-read from DB to avoid drift; cheap because we already have the
      // row's id and the column is a fixed-width timestamp.
      updatedAt: await readUpdatedAt(postId),
    };
  }

  const now = new Date();
  await db
    .update(topicPosts)
    .set({
      content: contentResult.content,
      isSpoiler: nextIsSpoiler,
      updatedAt: now,
    })
    .where(eq(topicPosts.id, postId));

  logActivityEvent({
    userId: user.id,
    action: 'edit_post',
    targetType: 'topic_post',
    targetId: postId,
    metadata: {
      topicType: post.topicType,
      topicKey: post.topicKey,
      contentChanged,
      spoilerChanged,
    },
  });

  revalidatePath(buildTopicDetailPath(post.topicType, post.topicKey, locale));

  return {
    success: true,
    content: contentResult.content,
    isSpoiler: nextIsSpoiler,
    updatedAt: now,
  };
}

async function readUpdatedAt(postId: string): Promise<Date> {
  const [row] = await db
    .select({ updatedAt: topicPosts.updatedAt })
    .from(topicPosts)
    .where(eq(topicPosts.id, postId))
    .limit(1);
  return row?.updatedAt ?? new Date();
}
