'use server';

import { redirect } from 'next/navigation';

import { db, topicPosts } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

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
    content: content.trim(),
  });

  redirect(`/${locale}/topics/squares/${square}`);
}
