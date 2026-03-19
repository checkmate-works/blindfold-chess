import { profiles, topicPostRatings } from '@/lib/db';
import type { Profile, TopicPost, TopicPostRating } from '@/lib/db';

/**
 * Shared Drizzle select fragments reused across topic query files.
 */
export const authorSelect = {
  username: profiles.username,
  displayName: profiles.displayName,
  avatarUrl: profiles.avatarUrl,
  flair: profiles.flair,
  country: profiles.country,
} as const;

export const ratingSelect = {
  preferenceRating: topicPostRatings.preferenceRating,
  proficiencyRating: topicPostRatings.proficiencyRating,
} as const;

export type TopicPostWithAuthor = TopicPost & {
  author: Pick<Profile, 'username' | 'displayName' | 'avatarUrl' | 'flair' | 'country'> | null;
};

export type Replier = {
  avatarUrl: string | null;
  displayName: string;
};

export type ReplyMeta = {
  replyCount: number;
  latestReplyAt: Date | null;
  repliers: Replier[];
  uniqueReplierCount: number;
};

export type LikeMeta = {
  likeCount: number;
  likedByMe: boolean;
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
 * Sort posts by the given mode. Mutates and returns the array.
 * - 'new': no-op (assumes posts are already sorted by createdAt DESC from the DB query)
 * - 'popular': by likeCount DESC, then createdAt DESC
 * - 'active': by latestReplyAt DESC, then createdAt DESC
 */
export function sortPosts<T extends PostWithReplyMeta>(posts: T[], sortBy: SortMode): T[] {
  if (sortBy === 'popular') {
    return posts.sort((a, b) => {
      const likeDiff = b.likeMeta.likeCount - a.likeMeta.likeCount;
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  if (sortBy === 'active') {
    return posts.sort((a, b) => {
      const aLatest = a.replyMeta.latestReplyAt ? new Date(a.replyMeta.latestReplyAt).getTime() : 0;
      const bLatest = b.replyMeta.latestReplyAt ? new Date(b.replyMeta.latestReplyAt).getTime() : 0;
      const replyDiff = bLatest - aLatest;
      if (replyDiff !== 0) return replyDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // 'new' — already sorted by createdAt DESC from the DB query
  return posts;
}
