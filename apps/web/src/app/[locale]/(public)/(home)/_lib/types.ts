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

// Discriminated union — extend with new entity types here
export type FeedItem = TopicPostFeedItem;

export type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
};
