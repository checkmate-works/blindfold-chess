'use server';

import { redirect } from 'next/navigation';

import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { db, topicPosts } from '@/lib/db';
import { notifyFollowersOfNewPost } from '@/lib/notification';
import type { RateLimitConfig } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'signInRequired' };
  }

  if (await isUserBanned(user.id)) {
    return { error: 'banned' };
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
      })
      .returning({ id: topicPosts.id });

    if (afterInsert) {
      await afterInsert(tx, post.id);
    }

    return post;
  });

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
