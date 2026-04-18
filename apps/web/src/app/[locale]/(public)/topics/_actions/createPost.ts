'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { authenticateAndCheckBan } from '@/lib/auth';
import { db, feedItems, topicPosts } from '@/lib/db';
import { GRANT_TYPE_DEFAULTS } from '@/lib/db/data/grant-types';
import { createNotification, notifyFollowersOfNewPost } from '@/lib/notifications/notification';
import type { RateLimitConfig } from '@/lib/security/rate-limit';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';
import { applyAutomatedGrant } from '@/lib/users/user-grants';

import { VALID_REPLY_PERMISSIONS } from '../_lib/constants';

export type CreatePostState = {
  error?: string;
};

export async function createPostBase(params: {
  locale: string;
  topicIdentifier: string;
  topicType: 'square' | 'opening';
  topicKey: string;
  urlSegment: string;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
  invalidTopicError: string;
  rateLimit: RateLimitConfig;
  validateContent: (formData: FormData) => { error: string } | { content: string };
  afterInsert?: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    postId: string
  ) => Promise<void>;
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
    formData,
  } = params;

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
      })
      .returning({ id: topicPosts.id });

    await tx.insert(feedItems).values({
      entityType: 'topic_post',
      entityId: post.id,
      actorId: user.id,
      metadata: { topicType, topicKey },
    });

    if (afterInsert) {
      await afterInsert(tx, post.id);
    }

    // Automated grant for text-bearing topic posts.
    // Rating-only posts (e.g., opening preference rating without comment)
    // do NOT qualify — the user must have written text to earn the grant.
    // Source linkage (sourceType + sourceId) enables targeted revocation
    // if the post is later deleted — see schema.ts userGrants @design source*.
    if (contentResult.content.trim() !== '') {
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
    createNotification({
      userId: user.id,
      type: 'benefit_grant',
      targetType: 'user_grant',
      targetId: info.grantId,
      metadata: {
        grantType: 'topic_post',
        benefitType: 'ad_free',
        durationDays: GRANT_TYPE_DEFAULTS.topic_post.durationDays,
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

  redirect(
    `/${locale}/topics/${urlSegment}/${topicIdentifier}/posts/${inserted.id}?toast=post_created`
  );
}
