'use client';

import type { FeedItem } from '../_lib/types';
import { ChallengeRankUpdateCard } from './ChallengeRankUpdateCard';
import { TopicPostCard } from './TopicPostCard';

type Props = {
  item: FeedItem;
  locale: string;
  showMoreLabel: string;
  justNowLabel: string;
  newReplyTemplate: string;
};

export function FeedCard({ item, locale, showMoreLabel, justNowLabel, newReplyTemplate }: Props) {
  switch (item.entityType) {
    case 'topic_post':
      return (
        <TopicPostCard
          post={item.data}
          locale={locale}
          showMoreLabel={showMoreLabel}
          justNowLabel={justNowLabel}
          newReplyTemplate={newReplyTemplate}
        />
      );
    case 'challenge_rank_update':
      return (
        <ChallengeRankUpdateCard
          data={item.data}
          createdAt={item.createdAt}
          locale={locale}
          justNowLabel={justNowLabel}
        />
      );
    default:
      return null;
  }
}
