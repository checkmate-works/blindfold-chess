import { topicPostRatings } from '@/lib/db';
import type { TopicPost, TopicPostRating } from '@/lib/db';
import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
import type { SocialAuthorProfile } from '@/lib/users/author-profile';

/**
 * Normalize a rating value: returns the rating if at least one field is non-null,
 * otherwise returns null. Prevents storing empty rating objects.
 */
export function normalizeRating(
  rating: Pick<TopicPostRating, 'preferenceRating' | 'proficiencyRating'> | null
): Pick<TopicPostRating, 'preferenceRating' | 'proficiencyRating'> | null {
  if (!rating) return null;
  return rating.preferenceRating !== null || rating.proficiencyRating !== null ? rating : null;
}

/**
 * Shared Drizzle select fragment reused across topic query files.
 */
export const ratingSelect = {
  preferenceRating: topicPostRatings.preferenceRating,
  proficiencyRating: topicPostRatings.proficiencyRating,
} as const;

export type TopicPostWithAuthor = TopicPost & {
  author: SocialAuthorProfile | null;
};

export type PostWithReplyMeta = TopicPostWithAuthor & {
  replyMeta: ReplyMeta;
  likeMeta: LikeMeta;
};

export type ProfilePostWithReplyMeta = PostWithReplyMeta & {
  topicKey: string;
  rating: Pick<TopicPostRating, 'preferenceRating' | 'proficiencyRating'> | null;
  openingName: string | null;
  openingFen: string | null;
};

export type SortMode = 'new' | 'popular' | 'active';

/**
 * Sort posts by the given mode. Pure: returns a new array, `posts` is not
 * mutated (it may be a cached row set the caller must not disturb).
 * - 'new': no reordering (assumes posts are already sorted by createdAt DESC from the DB query)
 * - 'popular': by likeCount DESC, then createdAt DESC
 * - 'active': by latestReplyAt DESC, then createdAt DESC
 */
export function sortPosts<T extends PostWithReplyMeta>(posts: readonly T[], sortBy: SortMode): T[] {
  if (sortBy === 'popular') {
    return posts.toSorted((a, b) => {
      const likeDiff = b.likeMeta.likeCount - a.likeMeta.likeCount;
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  if (sortBy === 'active') {
    return posts.toSorted((a, b) => {
      const aLatest = a.replyMeta.latestReplyAt ? new Date(a.replyMeta.latestReplyAt).getTime() : 0;
      const bLatest = b.replyMeta.latestReplyAt ? new Date(b.replyMeta.latestReplyAt).getTime() : 0;
      const replyDiff = bLatest - aLatest;
      if (replyDiff !== 0) return replyDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // 'new' — already sorted by createdAt DESC from the DB query
  return [...posts];
}
