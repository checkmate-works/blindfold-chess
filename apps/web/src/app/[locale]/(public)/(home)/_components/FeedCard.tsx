import type { EngagementCounterSize } from '@/app/[locale]/_components/EngagementCounter';

import type { FeedItem } from '../_lib/types';
import { ChallengeRankUpdateCard } from './ChallengeRankUpdateCard';
import { ChunkFeedCard } from './ChunkFeedCard';
import { GameFeedCard } from './GameFeedCard';
import { PositionFeedCard } from './PositionFeedCard';
import { TopicPostCard } from './TopicPostCard';

type Props = {
  item: FeedItem;
  locale: string;
  showMoreLabel: string;
  justNowLabel: string;
  /**
   * ActivityCard layout forwarded to the underlying card: `'feed'` (divider
   * list, default — home feed) or `'card'` (stand-alone bordered card — topics
   * list). Only the entity types surfaced outside the home feed (`topic_post`,
   * `chunk`) honor it today.
   */
  variant?: 'feed' | 'card';
  /** Size variant for the footer engagement actions (like + comment counter), forwarded to each card's `PostFooter`. */
  actionSize?: EngagementCounterSize;
};

export function FeedCard({
  item,
  locale,
  showMoreLabel,
  justNowLabel,
  variant,
  actionSize,
}: Props) {
  switch (item.entityType) {
    case 'topic_post':
      return (
        <TopicPostCard
          post={item.data}
          locale={locale}
          showMoreLabel={showMoreLabel}
          justNowLabel={justNowLabel}
          variant={variant}
          actionSize={actionSize}
        />
      );
    case 'position':
      return (
        <PositionFeedCard
          data={item.data}
          locale={locale}
          justNowLabel={justNowLabel}
          actionSize={actionSize}
        />
      );
    case 'game':
      return (
        <GameFeedCard
          data={item.data}
          locale={locale}
          justNowLabel={justNowLabel}
          actionSize={actionSize}
        />
      );
    case 'chunk':
      return (
        <ChunkFeedCard
          data={item.data}
          createdAt={item.createdAt}
          locale={locale}
          justNowLabel={justNowLabel}
          variant={variant}
          actionSize={actionSize}
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
