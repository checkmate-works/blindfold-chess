'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import { authenticateCheckBanAndRequireProfile } from '@/lib/auth';
import { TOPIC_POST_COUNTS_CACHE_TAG } from '@/lib/cache-tags';
import { db, feedItems, topicPosts } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import { isBlockedBetween } from '@/lib/moderation/block';
import {
  notifyFollowersOfNewPost,
  notifyTopicAuthorOfNewComment,
} from '@/lib/notifications/notification';
import type { RateLimitConfig } from '@/lib/security/rate-limit';
import { checkRateLimit } from '@/lib/security/rate-limit';

import { VALID_REPLY_PERMISSIONS } from '../_lib/constants';
import type { TopicType } from '../_lib/constants';
import type { ImageAttachResult } from '../_lib/image-attach-types';

export type CreatePostState = {
  error?: string;
};

type CreatePostParams = {
  locale: string;
  topicIdentifier: string;
  topicType: TopicType;
  topicKey: string;
  urlSegment: string;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
  invalidTopicError: string;
  rateLimit: RateLimitConfig;
  validateContent: (formData: FormData) => { error: string } | { content: string };
  afterInsert?: (tx: DbTx, postId: string) => Promise<void>;
  /**
   * Whether to insert a row into `feed_items` for this post. Defaults to `true`
   * for parity with the legacy behavior. 'chunk' comments pass `false` because
   * they are treated as reply-equivalent and should not surface in the home feed.
   */
  emitFeedItem?: boolean;
  /**
   * Override the post-creation redirect URL. The function receives the new
   * post ID and must return the absolute path to redirect to — including its
   * own `?toast=post_created` if the destination should confirm the create.
   * When omitted, the legacy
   * `/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${postId}`
   * URL is used, with `?toast=post_created` appended.
   */
  redirectPath?: (postId: string) => string;
  /**
   * Self-declared "this comment contains spoilers" flag, persisted to
   * `topic_posts.is_spoiler`. Surface today is `topic_type='position_puzzle'`
   * only — every other call site can omit this and the column defaults to
   * `false`. Wrappers that accept user input for this field should validate
   * the FormData value upstream and pass a strict boolean here.
   */
  isSpoiler?: boolean;
  /**
   * Optional ID of the topic's author. When provided, the author will receive
   * a notification about the new post (comment).
   */
  topicAuthorId?: string | null;
  formData: FormData;
};

/**
 * Shared insert/notify core for every create-post path.
 *
 * Returns the new post id instead of redirecting, so both the legacy
 * redirecting wrapper (`createPostBase`) and the 2-step image-attach wrapper
 * (`createPostForImageAttachBase`) share one body. This keeps feed-item
 * emission and notifications from drifting between the two paths.
 */
async function insertPost(
  params: CreatePostParams
): Promise<{ error: string } | { ok: true; postId: string }> {
  const {
    locale,
    topicIdentifier,
    topicType,
    topicKey,
    validateTopic,
    invalidTopicError,
    rateLimit,
    validateContent,
    afterInsert,
    emitFeedItem,
    isSpoiler,
    topicAuthorId,
    formData,
  } = params;

  assertSupportedLocale(locale);

  const shouldEmitFeedItem = emitFeedItem ?? true;

  if (!(await validateTopic(topicIdentifier))) {
    return { error: invalidTopicError };
  }

  const guardResult = await authenticateCheckBanAndRequireProfile();
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  // Commenting on someone's content (topicAuthorId set) is a user→user write;
  // once either party has blocked the other, reject it.
  if (
    topicAuthorId &&
    topicAuthorId !== user.id &&
    (await isBlockedBetween(user.id, topicAuthorId))
  ) {
    return { error: 'moderation.blocked' };
  }

  const contentResult = validateContent(formData);
  if ('error' in contentResult) {
    return { error: contentResult.error };
  }

  const replyPermissionRaw = formData.get('replyPermission');
  const replyPermission =
    typeof replyPermissionRaw === 'string' &&
    (VALID_REPLY_PERMISSIONS as readonly string[]).includes(replyPermissionRaw)
      ? replyPermissionRaw
      : null;

  if (!replyPermission) {
    return { error: 'invalidReplyPermission' };
  }

  const rateLimitResult = await checkRateLimit(user.id, rateLimit);
  if ('error' in rateLimitResult) {
    return { error: rateLimitResult.error };
  }

  const inserted = await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(topicPosts)
      .values({
        userId: user.id,
        topicType,
        topicKey,
        content: contentResult.content,
        replyPermission,
        ...(isSpoiler !== undefined ? { isSpoiler } : {}),
      })
      .returning({ id: topicPosts.id });

    if (shouldEmitFeedItem) {
      await tx.insert(feedItems).values({
        entityType: 'topic_post',
        entityId: post.id,
        actorId: user.id,
        metadata: { topicType, topicKey },
      });
    }

    if (afterInsert) {
      await afterInsert(tx, post.id);
    }

    return post;
  });

  // The topic index pages paginate against cached top-level COUNTs; expire
  // them now so the author's next index load agrees with the list beside
  // it. Outside the transaction because revalidation observes the commit.
  revalidateTag(TOPIC_POST_COUNTS_CACHE_TAG, { expire: 0 });

  notifyFollowersOfNewPost({
    actorId: user.id,
    postId: inserted.id,
    topicType,
    topicKey,
  });

  // Only paths that supply a topic author notify them — and a null id (the
  // author was anonymised: account purged) is likewise skipped, since the
  // guard treats it as "no author to notify". Self-notification is dropped
  // inside notifyTopicAuthorOfNewComment.
  if (topicAuthorId) {
    notifyTopicAuthorOfNewComment({
      authorId: topicAuthorId,
      actorId: user.id,
      postId: inserted.id,
      topicType,
      topicKey,
    });
  }

  return { ok: true, postId: inserted.id };
}

export async function createPostBase(params: CreatePostParams): Promise<CreatePostState> {
  const result = await insertPost(params);
  if ('error' in result) {
    return { error: result.error };
  }

  // The author always lands directly on their post so they can verify it,
  // with the "created" toast confirming the create on arrival.
  const finalUrl = params.redirectPath
    ? params.redirectPath(result.postId)
    : `/${params.locale}/topics/${params.urlSegment}/${params.topicIdentifier}/posts/${result.postId}?toast=post_created`;
  redirect(finalUrl);
}

/**
 * Create-post entry point for the 2-step image-attachment flow.
 *
 * Mirrors `createPostBase` (same validation, rate-limit bucket, feed
 * item and notifications via the shared `insertPost` core) but returns the
 * new post id instead of redirecting, so the client can POST each selected
 * image to `/api/posts/[id]/images` after the post exists; the client then
 * refreshes the thread in place once uploads finish.
 */
export async function createPostForImageAttachBase(
  params: CreatePostParams
): Promise<ImageAttachResult> {
  const result = await insertPost(params);
  if ('error' in result) {
    return { ok: false, error: result.error };
  }
  return { ok: true, postId: result.postId };
}
