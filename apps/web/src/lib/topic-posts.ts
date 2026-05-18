import { eq } from 'drizzle-orm';

import { db, topicPosts } from '@/lib/db';

/** The columns every author-scoped topic_post action / route needs. */
export type AuthoredPost = {
  id: string;
  userId: string;
  topicType: string;
  topicKey: string;
  content: string;
  isSpoiler: boolean;
  deletedAt: Date | null;
};

/**
 * Why a {@link loadAuthoredPost} lookup failed. Callers map this to their own
 * error vocabulary — Server Actions to i18n error keys, the images API route
 * to HTTP status codes — because those vocabularies legitimately differ.
 */
export type AuthoredPostError = 'notFound' | 'unauthorized' | 'alreadyDeleted';

export type AuthoredPostLookup = { post: AuthoredPost } | { error: AuthoredPostError };

/**
 * Load a topic_post and assert the caller authored it and it is not
 * soft-deleted — the existence + ownership + tombstone guard every
 * author-scoped post mutation runs before touching the row.
 */
export async function loadAuthoredPost(
  postId: string,
  userId: string
): Promise<AuthoredPostLookup> {
  const [post] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      topicType: topicPosts.topicType,
      topicKey: topicPosts.topicKey,
      content: topicPosts.content,
      isSpoiler: topicPosts.isSpoiler,
      deletedAt: topicPosts.deletedAt,
    })
    .from(topicPosts)
    .where(eq(topicPosts.id, postId))
    .limit(1);

  if (!post) {
    return { error: 'notFound' };
  }
  if (post.userId !== userId) {
    return { error: 'unauthorized' };
  }
  if (post.deletedAt) {
    return { error: 'alreadyDeleted' };
  }
  return { post };
}
