/**
 * Timeline Feed Type Definitions
 *
 * @design Polymorphic entity pattern (entityType + entityId)
 * Feed items use a discriminated union keyed by `entityType`. Each variant
 * carries a `data` payload whose shape differs per entity type. This mirrors
 * the polymorphic target pattern used by `user_activity_log` and
 * `moderation_actions` elsewhere in the codebase.
 *
 * @design Adding a new entity type
 * 1. Define a new `data` type (e.g. `GameResultData`)
 * 2. Create a variant type extending `FeedItemBase` with a literal `entityType`
 * 3. Add the variant to the `FeedItem` union
 * 4. Add batch-fetch logic in `queries.ts` (see existing patterns)
 * 5. Add a card component and a `case` in `FeedCard.tsx`
 * 6. INSERT into `feed_items` transactionally alongside entity creation
 *
 * @design isNewEntry (challenge_rank_update)
 * `true` when the user's first-ever score for a leaderboard key is recorded;
 * `false` when an existing best score is surpassed.
 */
import type { PositionType } from '@/lib/positions/types';

import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

export type PositionFeedData = {
  id: string;
  /** Used to route the card to the correct detail page. */
  type: PositionType;
  fen: string;
  createdAt: string; // ISO 8601
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    country: string | null;
    flair: string | null;
  } | null;
  likeMeta: {
    likeCount: number;
    likedByMe: boolean;
  };
  /**
   * Aggregate comment-thread meta for the position. Comments live in
   * `topic_posts` keyed by `(topicType, topicKey)` where `topicKey` is
   * the position's id and `topicType` is `'position_memory'` or
   * `'position_puzzle'`. `sequence`-type positions have no comment
   * thread and receive an empty meta block.
   */
  replyMeta: {
    replyCount: number;
    latestReplyAt: Date | null;
    repliers: { avatarUrl: string | null; displayName: string }[];
    uniqueReplierCount: number;
  };
};

type FeedItemBase = {
  id: string;
  entityType: string;
  entityId: string;
  actorId: string;
  createdAt: string; // ISO 8601
};

export type TopicPostFeedItem = FeedItemBase & {
  entityType: 'topic_post';
  data: ProfilePostWithReplyMeta;
};

export type ChallengeRankUpdateData = {
  menuType: string;
  leaderboardKey: string;
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
  rank: number;
  /** true = first submission for this leaderboard key; false = improved existing best */
  isNewEntry: boolean;
  /** Previous rank before the improvement. Only present when isNewEntry is false. */
  previousRank?: number;
  actor: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    country: string | null;
    flair: string | null;
  };
};

export type ChallengeRankUpdateFeedItem = FeedItemBase & {
  entityType: 'challenge_rank_update';
  data: ChallengeRankUpdateData;
};

export type PositionFeedItem = FeedItemBase & {
  entityType: 'position';
  data: PositionFeedData;
};

/**
 * A chunk surfaces in the feed twice during its lifecycle: once when first
 * created (typically as a draft soliciting edit requests) and once when
 * promoted to published. `kind` distinguishes the two events so the card can
 * render the right action message; the chunk itself is the same row in
 * `chunks`. Comments live in `topic_posts` keyed by
 * `(topicType='chunk', topicKey=chunk.slug)` — same pattern as positions.
 */
export type ChunkFeedData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
  /** Snapshot of the lifecycle event that produced this feed item. */
  kind: 'created' | 'published';
  createdAt: string; // ISO 8601
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    country: string | null;
    flair: string | null;
  } | null;
  likeMeta: {
    likeCount: number;
    likedByMe: boolean;
  };
  replyMeta: {
    replyCount: number;
    latestReplyAt: Date | null;
    repliers: { avatarUrl: string | null; displayName: string }[];
    uniqueReplierCount: number;
  };
};

export type ChunkFeedItem = FeedItemBase & {
  entityType: 'chunk';
  data: ChunkFeedData;
};

// Discriminated union — extend with new entity types here
export type FeedItem =
  | TopicPostFeedItem
  | ChallengeRankUpdateFeedItem
  | PositionFeedItem
  | ChunkFeedItem;

export type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
};

/** A single entry in the interleaved feed + ad display list. */
export type DisplayItem = { type: 'feed'; item: FeedItem } | { type: 'ad' };
