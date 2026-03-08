'use server';

import { revalidatePath } from 'next/cache';

import { isUserBanned } from '@/lib/ban';
import { db, topicPosts } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { isValidSquare } from '../../../../_lib/squares';

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

  const content = formData.get('content');

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { error: 'contentRequired' };
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return { error: 'contentTooLong' };
  }

  await db.insert(topicPosts).values({
    userId: user.id,
    topicType: 'square',
    topicKey: square,
    parentId: postId,
    content: content.trim(),
  });

  revalidatePath(`/${locale}/topics/squares/${square}/posts/${postId}`);

  return {};
}
