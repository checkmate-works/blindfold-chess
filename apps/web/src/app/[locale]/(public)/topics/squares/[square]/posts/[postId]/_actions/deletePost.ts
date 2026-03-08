'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, isNull } from 'drizzle-orm';

import { isUserBanned } from '@/lib/ban';
import { db, topicPosts } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

type DeletePostResult = { success: true } | { error: string };

export async function deletePost(postId: string, locale: string): Promise<DeletePostResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'unauthorized' };
  }

  if (await isUserBanned(user.id)) {
    return { error: 'banned' };
  }

  const [post] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      topicType: topicPosts.topicType,
      topicKey: topicPosts.topicKey,
      deletedAt: topicPosts.deletedAt,
    })
    .from(topicPosts)
    .where(eq(topicPosts.id, postId))
    .limit(1);

  if (!post) {
    return { error: 'notFound' };
  }

  if (post.userId !== user.id) {
    return { error: 'unauthorized' };
  }

  if (post.deletedAt) {
    return { error: 'alreadyDeleted' };
  }

  await db
    .update(topicPosts)
    .set({ deletedAt: new Date() })
    .where(and(eq(topicPosts.id, postId), isNull(topicPosts.deletedAt)));

  revalidatePath(`/${locale}/topics/squares/${post.topicKey}`);

  return { success: true };
}
