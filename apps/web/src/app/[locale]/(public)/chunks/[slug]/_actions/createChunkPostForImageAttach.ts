'use server';

/**
 * @deprecated #84 Pre-release scope reduction: the Media tab is
 * removed from `AttachmentModal`, so this Server Action is no longer
 * invoked by any UI flow. The file is kept intact (rather than
 * deleted) so a future release can re-enable the 2-step image upload
 * flow by restoring the Media tab + `kind: 'image'` arm in
 * `NewPostForm`'s submit handler. The render layer
 * (`AttachedImageCard`) and the `/api/posts/[id]/images` endpoint
 * remain wired so existing posts still display.
 */
import { revalidateTag } from 'next/cache';

import { authenticateAndCheckBan } from '@/lib/auth';
import { getChunkBySlug } from '@/lib/chunks/queries';
import { db, topicPosts } from '@/lib/db';
import { GRANT_TYPE_DEFAULTS, isTopicPostGrantTopicType } from '@/lib/db/data/grant-types';
import { createNotification, notifyFollowersOfNewPost } from '@/lib/notifications/notification';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';
import { applyAutomatedGrant } from '@/lib/users/user-grants';
import { validateContent } from '@/lib/validations/content';

import { VALID_REPLY_PERMISSIONS } from '@/app/[locale]/(public)/topics/_lib/constants';

/**
 * Result shape — discriminated union so the client can narrow without
 * runtime guards (Lessons §13). On success the new post id is returned
 * so the client can drive the 2-step image upload (D1 case B).
 */
export type CreateChunkPostForImageAttachResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

/**
 * Server Action: create a chunk-topic post WITHOUT redirecting, returning
 * the new post id to the client so it can drive the inline image upload.
 *
 * @description
 * Pairs the existing `createChunkPost` for the image-attachment flow.
 * The standard action ends with `redirect()`, which makes the new post
 * id unreachable from the client. The image flow (SPEC2 D1 case B) is
 * 2-step:
 *   1. (this action) create the post — get post id
 *   2. (client) POST each File to `/api/posts/[id]/images`
 * so we need the id back. Aside from the redirect-vs-return difference,
 * this action mirrors `createChunkPost`'s behavior: same validation,
 * same rate-limit bucket, same automated grant on text-bearing posts.
 *
 * @design Not a thin wrapper around createPostBase
 *
 * `createPostBase` always redirects at the end (via next/navigation).
 * Wrapping it would force the client to round-trip via the redirect,
 * losing the post id. Re-implementing the small post-create body here
 * is the cleanest way to keep the redirect behavior intact for every
 * other call site while exposing an id-returning entry point for image.
 *
 * @design Single-kind invariant
 *
 * The single-kind constraint (SPEC2 D3) is enforced upstream at the
 * client form (NewPostForm). This action only knows about the post
 * itself; the image rows are inserted by the upload endpoint after the
 * post id is in hand.
 */
export async function createChunkPostForImageAttach(
  locale: string,
  slug: string,
  formData: FormData
): Promise<CreateChunkPostForImageAttachResult> {
  const _locale = locale;
  void _locale;
  if (!(await getChunkBySlug(slug))) {
    return { ok: false, error: 'Invalid chunk' };
  }

  const guardResult = await authenticateAndCheckBan();
  if ('error' in guardResult) {
    return { ok: false, error: guardResult.error };
  }
  const { user } = guardResult;

  const contentResult = validateContent(formData);
  if ('error' in contentResult) {
    return { ok: false, error: contentResult.error };
  }

  const replyPermissionRaw = formData.get('replyPermission');
  const replyPermission =
    typeof replyPermissionRaw === 'string' &&
    (VALID_REPLY_PERMISSIONS as readonly string[]).includes(replyPermissionRaw)
      ? replyPermissionRaw
      : null;

  if (!replyPermission) {
    return { ok: false, error: 'invalidReplyPermission' };
  }

  const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.createPost);
  if ('error' in rateLimitResult) {
    return { ok: false, error: rateLimitResult.error };
  }

  let grantInfo: { grantId: string; expiresAt: Date } | null = null;
  const inserted = await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(topicPosts)
      .values({
        userId: user.id,
        topicType: 'chunk',
        topicKey: slug,
        content: contentResult.content,
        replyPermission,
      })
      .returning({ id: topicPosts.id });

    // Chunk posts intentionally do NOT emit feed_items (mirrors
    // createChunkPost's `emitFeedItem: false`).

    if (isTopicPostGrantTopicType('chunk') && contentResult.content.trim() !== '') {
      grantInfo = await applyAutomatedGrant(tx, user.id, 'topic_post', {
        type: 'topic_post',
        id: post.id,
      });
    }

    return post;
  });

  if (grantInfo) {
    revalidateTag('grant-status', { expire: 60 });
    const info: { grantId: string; expiresAt: Date } = grantInfo;
    const grantTypeConfig = GRANT_TYPE_DEFAULTS.topic_post;
    createNotification({
      userId: user.id,
      type: 'benefit_grant',
      targetType: 'user_grant',
      targetId: info.grantId,
      metadata: {
        grantType: 'topic_post',
        benefitType: grantTypeConfig.benefitType,
        durationDays: grantTypeConfig.durationDays,
        expiresAt: info.expiresAt.toISOString(),
        reason: null,
      },
    });
  }

  logActivityEvent({
    userId: user.id,
    action: 'create_post',
    targetType: 'topic_post',
    targetId: inserted.id,
    metadata: { topicType: 'chunk', topicKey: slug },
  });

  notifyFollowersOfNewPost({
    actorId: user.id,
    postId: inserted.id,
    topicType: 'chunk',
    topicKey: slug,
  });

  return { ok: true, postId: inserted.id };
}
