import { eq } from 'drizzle-orm';

import { db, topicPosts } from '@/lib/db';
import { guardOwnership } from '@/lib/ownership-guard';
import type { OwnershipError } from '@/lib/ownership-guard';

// `delete-core` is intentionally NOT re-exported from this barrel. It
// pulls in `server-only` modules (`@/lib/points`, `next/cache`), and
// every caller of `loadAuthoredPost` would otherwise be forced to load
// that graph — which crashes Vitest test files that only mock the
// reads. Import `@/lib/topic-posts/delete-core` directly instead.

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
 *
 * An alias of {@link OwnershipError}: this is the same gate the chunk,
 * position and repertoire mutations run, and the shared name is what keeps the
 * four vocabularies from drifting apart again.
 */
export type AuthoredPostError = OwnershipError;

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

  const error = guardOwnership(post, userId);
  if (error) {
    return { error };
  }
  // `topic_posts.user_id` is nullable (anonymised on author purge — see schema).
  // An anonymised post has no author, so the guard above rejects it for
  // everyone; past it, `post.userId` is provably the live, non-null caller, so
  // substitute the param to keep `AuthoredPost.userId` non-null downstream.
  return { post: { ...post, userId } };
}
