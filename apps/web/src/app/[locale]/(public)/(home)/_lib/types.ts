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
  isNewEntry: boolean;
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
