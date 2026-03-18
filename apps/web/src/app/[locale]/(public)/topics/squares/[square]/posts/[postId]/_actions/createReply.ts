'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { and, eq, isNull } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { db, topicPosts, userFollows } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { isValidSquare } from '../../../../_lib/squares';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CONTENT_LENGTH = 5000;

type CreateReplyState = {
  error?: string;
};

export async function createReply(
  locale: string,
  square: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  if (!isValidSquare(square)) {
    return { error: 'Invalid square' };
  }

  if (!UUID_RE.test(postId)) {
    return { error: 'invalidPostId' };
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

  const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.createReply);
  if ('error' in rateLimitResult) {
    return { error: rateLimitResult.error };
  }

  const [parentPost] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      replyPermission: topicPosts.replyPermission,
    })
    .from(topicPosts)
    .where(and(eq(topicPosts.id, postId), isNull(topicPosts.deletedAt)));

  if (!parentPost) {
    return { error: 'postNotFound' };
  }

  const isAuthor = parentPost.userId === user.id;

  if (!isAuthor && parentPost.replyPermission === 'nobody') {
    return { error: 'repliesDisabled' };
  }

  if (!isAuthor && parentPost.replyPermission === 'followers') {
    const [follow] = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(
        and(eq(userFollows.followerId, user.id), eq(userFollows.followingId, parentPost.userId))
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

  const [inserted] = await db
    .insert(topicPosts)
    .values({
      userId: user.id,
      topicType: 'square',
      topicKey: square,
      parentId: postId,
      content: content.trim(),
    })
    .returning({ id: topicPosts.id });

  logActivityEvent({
    userId: user.id,
    action: 'create_reply',
    targetType: 'topic_post',
    targetId: inserted.id,
    metadata: { parentId: postId, topicKey: square },
  });

  revalidatePath(`/${locale}/topics/squares/${square}/posts/${postId}`);

  redirect(`/${locale}/topics/squares/${square}/posts/${postId}?toast=post_created`);
}
