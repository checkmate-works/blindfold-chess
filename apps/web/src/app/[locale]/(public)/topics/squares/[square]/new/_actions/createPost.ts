'use server';

import { redirect } from 'next/navigation';

import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { db, topicPosts } from '@/lib/db';
import { notifyFollowersOfNewPost } from '@/lib/notification';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { VALID_REPLY_PERMISSIONS } from '../../../../_lib/constants';
import { isValidSquare } from '../../../_lib/squares';

const MAX_CONTENT_LENGTH = 5000;

type CreatePostState = {
  error?: string;
};

export async function createPost(
  locale: string,
  square: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  if (!isValidSquare(square)) {
    return { error: 'Invalid square' };
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

  const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.createPost);
  if ('error' in rateLimitResult) {
    return { error: rateLimitResult.error };
  }

  const content = formData.get('content');

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { error: 'contentRequired' };
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return { error: 'contentTooLong' };
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

  const [inserted] = await db
    .insert(topicPosts)
    .values({
      userId: user.id,
      topicType: 'square',
      topicKey: square,
      content: content.trim(),
      replyPermission,
    })
    .returning({ id: topicPosts.id });

  logActivityEvent({
    userId: user.id,
    action: 'create_post',
    targetType: 'topic_post',
    targetId: inserted.id,
    metadata: { topicType: 'square', topicKey: square },
  });

  notifyFollowersOfNewPost({
    actorId: user.id,
    postId: inserted.id,
    topicType: 'square',
    topicKey: square,
  });

  redirect(`/${locale}/topics/squares/${square}/posts/${inserted.id}?toast=post_created`);
}
