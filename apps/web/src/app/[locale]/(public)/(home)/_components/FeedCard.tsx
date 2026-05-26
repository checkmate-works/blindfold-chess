import type { FeedItem } from '../_lib/types';
import { ChallengeRankUpdateCard } from './ChallengeRankUpdateCard';
import { ChunkFeedCard } from './ChunkFeedCard';
import { PositionFeedCard } from './PositionFeedCard';
import { TopicPostCard } from './TopicPostCard';

type Props = {
  item: FeedItem;
  locale: string;
  showMoreLabel: string;
  justNowLabel: string;
};

export function FeedCard({ item, locale, showMoreLabel, justNowLabel }: Props) {
  switch (item.entityType) {
    case 'topic_post':
      return (
        <TopicPostCard
          post={item.data}
          locale={locale}
          showMoreLabel={showMoreLabel}
          justNowLabel={justNowLabel}
        />
      );
    case 'position':
      return <PositionFeedCard data={item.data} locale={locale} justNowLabel={justNowLabel} />;
    case 'chunk':
      return (
        <ChunkFeedCard
          data={item.data}
          createdAt={item.createdAt}
          locale={locale}
          justNowLabel={justNowLabel}
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
