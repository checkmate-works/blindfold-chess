'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { and, eq, isNull } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { db, topicPosts, userFollows } from '@/lib/db';
import { createNotification } from '@/lib/notifications/notification';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';
import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';
import { UUID_RE } from '@/lib/validations/uuid';

import type { TopicType } from '../_lib/constants';

export type CreateReplyState = {
  error?: string;
};

export async function createReplyBase(params: {
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
  afterInsert?: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    replyId: string
  ) => Promise<void>;
  formData: FormData;
}): Promise<CreateReplyState> {
  const {
    locale,
    topicIdentifier,
    postId,
    topicType,
    topicKey,
    urlSegment,
    validateTopic,
    redirectPath,
    revalidate,
    isSpoiler,
    afterInsert,
    formData,
  } = params;

  if (!(await validateTopic(topicIdentifier))) {
    return { error: `Invalid ${topicType}` };
  }

  if (!UUID_RE.test(postId)) {
    return { error: 'invalidPostId' };
  }

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

  // Determine parentId, rootPostId, and which post to check permissions on.
  let parentId: string;
  let rootPostId: string;
  let permissionPost: { userId: string; replyPermission: string };
  let notifyUserId: string;

  if (targetId === postId) {
    // Case A: Reply to a top-level post (existing behavior)
    const [topLevelPost] = await db
      .select({
        id: topicPosts.id,
        userId: topicPosts.userId,
        replyPermission: topicPosts.replyPermission,
      })
      .from(topicPosts)
      .where(and(eq(topicPosts.id, postId), isNull(topicPosts.deletedAt)));

    if (!topLevelPost) {
      return { error: 'postNotFound' };
    }

    parentId = postId;
    rootPostId = postId;
    permissionPost = topLevelPost;
    notifyUserId = topLevelPost.userId;
  } else {
    // Case B: Reply to another reply
    const [targetReply] = await db
      .select({
        id: topicPosts.id,
        userId: topicPosts.userId,
        rootPostId: topicPosts.rootPostId,
      })
      .from(topicPosts)
      .where(and(eq(topicPosts.id, targetId), isNull(topicPosts.deletedAt)));

    if (!targetReply) {
      return { error: 'postNotFound' };
    }

    // The target reply's rootPostId tells us the top-level post.
    // If rootPostId is null, the target is itself a top-level post (shouldn't happen
    // in this branch since targetId != postId, but handle defensively).
    rootPostId = targetReply.rootPostId ?? postId;
    parentId = targetId;
    notifyUserId = targetReply.userId;

    // Permission check uses the root (top-level) post
    const [rootPost] = await db
      .select({
        id: topicPosts.id,
        userId: topicPosts.userId,
        replyPermission: topicPosts.replyPermission,
      })
      .from(topicPosts)
      .where(and(eq(topicPosts.id, rootPostId), isNull(topicPosts.deletedAt)));

    if (!rootPost) {
      return { error: 'postNotFound' };
    }

    permissionPost = rootPost;
  }

  const isAuthor = permissionPost.userId === user.id;

  if (!isAuthor && permissionPost.replyPermission === 'nobody') {
    return { error: 'repliesDisabled' };
  }

  if (!isAuthor && permissionPost.replyPermission === 'followers') {
    const [follow] = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(
        and(eq(userFollows.followerId, user.id), eq(userFollows.followingId, permissionPost.userId))
      );

    if (!follow) {
      return { error: 'followRequired' };
    }
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

  logActivityEvent({
    userId: user.id,
    action: 'create_reply',
    targetType: 'topic_post',
    targetId: inserted.id,
    metadata: { parentId, topicKey },
  });

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
    // This is a reply-to-reply; notify the thread owner too
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

  revalidatePath(
    revalidate
      ? revalidate(postId)
      : `/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${postId}`
  );

  redirect(
    redirectPath
      ? redirectPath(postId, inserted.id)
      : `/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${postId}?toast=post_created`
  );
}
