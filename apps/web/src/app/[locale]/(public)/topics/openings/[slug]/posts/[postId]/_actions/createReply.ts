'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { and, eq, isNull } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { db, topicPosts } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { isValidOpening } from '../../../../_lib/queries';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CONTENT_LENGTH = 5000;

type CreateReplyState = {
  error?: string;
};

export async function createReply(
  locale: string,
  slug: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  if (!(await isValidOpening(slug))) {
    return { error: 'Invalid opening' };
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
    .select({ id: topicPosts.id })
    .from(topicPosts)
    .where(and(eq(topicPosts.id, postId), isNull(topicPosts.deletedAt)));

  if (!parentPost) {
    return { error: 'postNotFound' };
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
      topicType: 'opening',
      topicKey: slug,
      parentId: postId,
      content: content.trim(),
    })
    .returning({ id: topicPosts.id });

  logActivityEvent({
    userId: user.id,
    action: 'create_reply',
    targetType: 'topic_post',
    targetId: inserted.id,
    metadata: { parentId: postId, topicKey: slug },
  });

  revalidatePath(`/${locale}/topics/openings/${slug}/posts/${postId}`);

  redirect(`/${locale}/topics/openings/${slug}/posts/${postId}?toast=post_created`);
}
