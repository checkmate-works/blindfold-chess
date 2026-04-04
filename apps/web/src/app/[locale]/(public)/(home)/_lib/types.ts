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
import type { AdBannerConfig } from '@/lib/ad';

import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

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

// Discriminated union — extend with new entity types here
export type FeedItem = TopicPostFeedItem | ChallengeRankUpdateFeedItem;

export type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
};

/** A single entry in the interleaved feed + ad display list. */
export type DisplayItem = { type: 'feed'; item: FeedItem } | { type: 'ad'; ad: AdBannerConfig };
