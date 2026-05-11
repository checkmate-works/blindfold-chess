'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { authenticateAndCheckBan } from '@/lib/auth';
import { db, feedItems, topicPosts } from '@/lib/db';
import { GRANT_TYPE_DEFAULTS, isTopicPostGrantTopicType } from '@/lib/db/data/grant-types';
import type { DbTx } from '@/lib/db/types';
import {
  createNotification,
  notifyFollowersOfNewPost,
  notifyTopicAuthorOfNewComment,
} from '@/lib/notifications/notification';
import type { RateLimitConfig } from '@/lib/security/rate-limit';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';
import { applyAutomatedGrant } from '@/lib/users/user-grants';

import { VALID_REPLY_PERMISSIONS } from '../_lib/constants';
import type { TopicType } from '../_lib/constants';

export type CreatePostState = {
  error?: string;
};

export async function createPostBase(params: {
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
}): Promise<CreatePostState> {
  const {
    locale,
    topicIdentifier,
    topicType,
    topicKey,
    urlSegment,
    validateTopic,
    invalidTopicError,
    rateLimit,
    validateContent,
    afterInsert,
    emitFeedItem,
    redirectPath,
    isSpoiler,
    topicAuthorId,
    formData,
  } = params;

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

  let grantApplied = false;
  let grantInfo: { grantId: string; expiresAt: Date } | null = null;
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

    // Automated 'topic_post' grant for text-bearing posts on eligible topic
    // types. Two gates compose: TOPIC_POST_GRANT_TOPIC_TYPES (in grant-types.ts)
    // is the single source of truth for which surfaces qualify — also drives
    // the FAQ table — and rating-only or empty-text posts are excluded.
    // Source linkage (sourceType + sourceId) enables targeted revocation
    // if the post is later deleted — see schema.ts userGrants @design source*.
    if (isTopicPostGrantTopicType(topicType) && contentResult.content.trim() !== '') {
      grantInfo = await applyAutomatedGrant(tx, user.id, 'topic_post', {
        type: 'topic_post',
        id: post.id,
      });
      grantApplied = true;
    }

    return post;
  });

  if (grantApplied && grantInfo) {
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
    metadata: { topicType, topicKey },
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

  // When an automated grant fires we route through the generic /thanks page
  // (with the original destination preserved as `returnUrl`) so the user sees
  // the awarded benefit. The post-created toast is suppressed in that path —
  // the thanks page is the celebration moment. No-grant posts (chunks,
  // rating-only opening posts, etc.) keep the legacy in-place toast UX.
  const finalUrl = redirectPath
    ? redirectPath(inserted.id, { toast: !grantApplied })
    : `/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${inserted.id}${
        !grantApplied ? '?toast=post_created' : ''
      }`;

  if (grantApplied && grantInfo) {
    const info: { grantId: string; expiresAt: Date } = grantInfo;
    redirect(`/${locale}/thanks?grantId=${info.grantId}&returnUrl=${encodeURIComponent(finalUrl)}`);
  }
  redirect(finalUrl);
}
