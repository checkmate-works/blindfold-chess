'use server';

import { redirect } from 'next/navigation';

import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';

import { authenticateAndCheckBan } from '@/lib/auth';
import { db, feedItems, topicPosts } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import {
  notifyFollowersOfNewPost,
  notifyTopicAuthorOfNewComment,
} from '@/lib/notifications/notification';
import { grantPointsForPost, isPointEligibleTopicType } from '@/lib/points';
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
   * post ID and a `toast` flag and must return the absolute path to redirect
   * to. The flag is `true` when the post does NOT trigger an automated grant
   * (legacy "post created" toast) and `false` when a grant was applied (the
   * toast is suppressed because the user is sent through `/thanks` instead —
   * see the redirect logic below). When `redirectPath` is omitted, the
   * legacy `/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${postId}`
   * URL is used (with `?toast=post_created` appended when `toast` is true).
   */
  redirectPath?: (postId: string, opts: { toast: boolean }) => string;
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
  topicAuthorId?: string;
  formData: FormData;
};

/**
 * Shared insert/notify/grant core for every create-post path.
 *
 * Returns the new post id (plus the point-grant result, which the
 * redirecting entry point needs to route through `/thanks`) instead of
 * redirecting, so both the legacy redirecting wrapper (`createPostBase`)
 * and the 2-step image-attach wrapper (`createPostForImageAttachBase`)
 * share one body. This keeps feed-item emission, point grants and
 * notifications from drifting between the two paths.
 */
async function insertPost(
  params: CreatePostParams
): Promise<
  | { error: string }
  | { ok: true; postId: string; pointGrant: { pointEventId: string; amount: number } | null }
> {
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

  const guardResult = await authenticateAndCheckBan();
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

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

  let pointGrantResult: { pointEventId: string; amount: number } | null = null;
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

    // Award points for text-bearing posts on eligible topic types —
    // immediately spendable. Gate is `isPointEligibleTopicType` (square /
    // opening) plus a non-empty body — rating-only and empty posts excluded.
    if (isPointEligibleTopicType(topicType) && contentResult.content.trim() !== '') {
      pointGrantResult = await grantPointsForPost(tx, user.id, {
        type: 'topic_post',
        id: post.id,
      });
    }

    return post;
  });

  notifyFollowersOfNewPost({
    actorId: user.id,
    postId: inserted.id,
    topicType,
    topicKey,
  });

  if (topicAuthorId) {
    notifyTopicAuthorOfNewComment({
      authorId: topicAuthorId,
      actorId: user.id,
      postId: inserted.id,
      topicType,
      topicKey,
    });
  }

  return { ok: true, postId: inserted.id, pointGrant: pointGrantResult };
}

export async function createPostBase(params: CreatePostParams): Promise<CreatePostState> {
  const result = await insertPost(params);
  if ('error' in result) {
    return { error: result.error };
  }

  // When a point grant fires we route through the generic /thanks page
  // (with the original destination preserved as `returnUrl`) so the user sees
  // how many points were earned. The post-created
  // toast is suppressed in that path — the thanks page is the celebration
  // moment. No-grant posts (chunks, rating-only opening posts, etc.) keep
  // the legacy in-place toast UX.
  const grantApplied = result.pointGrant !== null;
  const finalUrl = params.redirectPath
    ? params.redirectPath(result.postId, { toast: !grantApplied })
    : `/${params.locale}/topics/${params.urlSegment}/${params.topicIdentifier}/posts/${result.postId}${
        !grantApplied ? '?toast=post_created' : ''
      }`;

  if (result.pointGrant) {
    const info = result.pointGrant;
    redirect(
      `/${params.locale}/thanks?pointEventId=${info.pointEventId}&returnUrl=${encodeURIComponent(finalUrl)}`
    );
  }
  redirect(finalUrl);
}

/**
 * Create-post entry point for the 2-step image-attachment flow.
 *
 * Mirrors `createPostBase` (same validation, rate-limit bucket, feed
 * item, point grant and notifications via the shared `insertPost` core)
 * but returns the new post id instead of redirecting, so the client can
 * POST each selected image to `/api/posts/[id]/images` after the post
 * exists. Any earned points are still granted inside the transaction;
 * the image flow simply skips the `/thanks` celebration redirect and
 * lets the client refresh the thread in place once uploads finish.
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
