'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import { authenticateAndGuard } from '@/lib/auth';
import { db, topicPosts } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import { createNotification } from '@/lib/notifications/notification';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';
import { UUID_RE, validateUUID } from '@/lib/validations/uuid';

import type { TopicType } from '../_lib/constants';
import type { ImageAttachResult } from '../_lib/image-attach-types';
import { enforceReplyPermission, resolveReplyTarget } from '../_lib/reply-resolution';

export type CreateReplyState = {
  error?: string;
};

type CreateReplyParams = {
  locale: string;
  topicIdentifier: string;
  postId: string;
  topicType: TopicType;
  topicKey: string;
  urlSegment: string;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
  /**
   * Override the post-creation redirect URL. Receives `(postId, replyId)` —
   * `postId` is the top-level post being replied to, `replyId` is the new
   * reply's id. When omitted, defaults to the legacy
   * `/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${postId}?toast=post_created` URL.
   */
  redirectPath?: (postId: string, replyId: string) => string;
  /**
   * Override the path passed to `revalidatePath` after insertion. When omitted,
   * defaults to the legacy `/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${postId}` path.
   */
  revalidate?: (postId: string) => string;
  /**
   * Self-declared "this reply contains spoilers" flag, persisted to
   * `topic_posts.is_spoiler`. Surface today is `topic_type='position_puzzle'`
   * only — every other call site can omit this and the column defaults to
   * `false`. Wrappers that accept user input for this field should validate
   * the FormData value upstream and pass a strict boolean here.
   */
  isSpoiler?: boolean;
  /**
   * Optional hook fired inside the same transaction as the reply INSERT so
   * topic-specific extra rows (e.g. `post_game_pgn_attachments`,
   * `post_fen_attachments`) land atomically with the reply itself. Mirrors
   * the contract on `createPostBase`. Side effects that don't need atomicity
   * (notifications, activity log, revalidate) stay outside the transaction.
   */
  afterInsert?: (tx: DbTx, replyId: string) => Promise<void>;
  formData: FormData;
};

/**
 * Shared validate/permission/insert/notify core for every create-reply
 * path. Returns the new reply id instead of redirecting so both the
 * legacy redirecting wrapper (`createReplyBase`) and the 2-step
 * image-attach wrapper (`createReplyForImageAttachBase`) share one body
 * and cannot drift on permission checks or notification fan-out.
 */
async function insertReply(
  params: CreateReplyParams
): Promise<{ error: string } | { ok: true; replyId: string }> {
  const {
    locale,
    topicIdentifier,
    postId,
    topicType,
    topicKey,
    validateTopic,
    isSpoiler,
    afterInsert,
    formData,
  } = params;

  assertSupportedLocale(locale);

  if (!(await validateTopic(topicIdentifier))) {
    return { error: `Invalid ${topicType}` };
  }

  const uuidError = validateUUID(postId, 'postId');
  if (uuidError) return uuidError;

  // replyToId: the specific post/reply being replied to.
  // When replying to a reply, this differs from postId (the top-level post from the URL).
  // When absent or equal to postId, this is a direct reply to the top-level post.
  const replyToId = formData.get('replyToId');
  const targetId =
    replyToId && typeof replyToId === 'string' && UUID_RE.test(replyToId) ? replyToId : postId;

  const guardResult = await authenticateAndGuard(RATE_LIMITS.createReply);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  // Determine parentId, rootPostId, and which post governs reply permission.
  const targetResult = await resolveReplyTarget(targetId, postId);
  if ('error' in targetResult) {
    return targetResult;
  }
  const { parentId, rootPostId, permissionPost, notifyUserId } = targetResult;

  const permissionError = await enforceReplyPermission(permissionPost, user.id);
  if (permissionError) {
    return permissionError;
  }

  const content = formData.get('content');

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { error: 'contentRequired' };
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return { error: 'contentTooLong' };
  }

  const inserted = await db.transaction(async (tx) => {
    const [reply] = await tx
      .insert(topicPosts)
      .values({
        userId: user.id,
        topicType,
        topicKey,
        parentId,
        rootPostId,
        content: content.trim(),
        ...(isSpoiler !== undefined ? { isSpoiler } : {}),
      })
      .returning({ id: topicPosts.id });

    if (afterInsert) {
      await afterInsert(tx, reply.id);
    }

    return reply;
  });

  // (createNotification no-ops when notifyUserId is null — anonymised author.)
  if (notifyUserId !== user.id) {
    createNotification({
      userId: notifyUserId,
      actorId: user.id,
      type: 'reply',
      targetType: 'topic_post',
      targetId: postId,
      metadata: { topicType, topicKey, postId, replyId: inserted.id },
    });
  }

  // Case B: Also notify the root post author (thread owner) if different
  if (parentId !== rootPostId) {
    // This is a reply-to-reply; notify the thread owner too.
    const rootPostAuthorId = permissionPost.userId;
    if (rootPostAuthorId !== user.id && rootPostAuthorId !== notifyUserId) {
      createNotification({
        userId: rootPostAuthorId,
        actorId: user.id,
        type: 'reply',
        targetType: 'topic_post',
        targetId: postId,
        metadata: { topicType, topicKey, postId, replyId: inserted.id },
      });
    }
  }

  return { ok: true, replyId: inserted.id };
}

/**
 * Default `revalidatePath` target shared by the redirecting and
 * image-attach reply entry points.
 */
function replyRevalidatePath(params: CreateReplyParams): string {
  return params.revalidate
    ? params.revalidate(params.postId)
    : `/${params.locale}/topics/${params.urlSegment}/${params.topicIdentifier}/posts/${params.postId}`;
}

export async function createReplyBase(params: CreateReplyParams): Promise<CreateReplyState> {
  const result = await insertReply(params);
  if ('error' in result) {
    return { error: result.error };
  }

  revalidatePath(replyRevalidatePath(params));

  redirect(
    params.redirectPath
      ? params.redirectPath(params.postId, result.replyId)
      : `/${params.locale}/topics/${params.urlSegment}/${params.topicIdentifier}/posts/${params.postId}?toast=post_created`
  );
}

/**
 * Create-reply entry point for the 2-step image-attachment flow.
 *
 * Mirrors `createReplyBase` (same permission checks, insert and
 * notification fan-out via the shared `insertReply` core) but returns
 * the new reply id instead of redirecting, so the client can POST each
 * selected image to `/api/posts/[id]/images` (keyed on the reply id).
 * `revalidatePath` still fires so the thread cache is fresh for the
 * client's post-upload `router.refresh()`.
 */
export async function createReplyForImageAttachBase(
  params: CreateReplyParams
): Promise<ImageAttachResult> {
  const result = await insertReply(params);
  if ('error' in result) {
    return { ok: false, error: result.error };
  }

  revalidatePath(replyRevalidatePath(params));

  return { ok: true, postId: result.replyId };
}
