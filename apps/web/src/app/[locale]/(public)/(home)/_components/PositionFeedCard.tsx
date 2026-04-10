'use client';

import { memo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_actions/toggleLike';
import { BoardThumbnail } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_components/BoardThumbnail';
import { PositionLikeButton } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_components/PositionLikeButton';
import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';

import type { PositionFeedData } from '../_lib/types';
import { FeedItemCard } from './FeedItemCard';

type Props = {
  data: PositionFeedData;
  locale: string;
  justNowLabel: string;
};

export const PositionFeedCard = memo(function PositionFeedCard({
  data,
  locale,
  justNowLabel,
}: Props) {
  const tFeed = useTranslations('home.feed.position');
  const displayName = data.author?.displayName || data.author?.username || 'Anonymous';
  const href = `/practice/position-memory/${data.id}`;

  return (
    <FeedItemCard
      href={href}
      locale={locale}
      thumbnail={<BoardThumbnail fen={data.fen} className="w-full h-full" />}
    >
      <UserAvatar
        profileHref={null}
        avatarUrl={data.author?.avatarUrl}
        displayName={displayName}
        locale={locale}
        size="sm"
        flair={data.author?.flair}
        country={data.author?.country}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <time dateTime={data.createdAt}>
          {formatRelativeTime(new Date(data.createdAt), locale, justNowLabel)}
        </time>
      </div>
      <p className="text-sm text-foreground mt-1">{tFeed('action')}</p>

      <div className="flex items-center gap-4 mt-1 pt-2 border-t border-border">
        <PositionLikeButton
          positionId={data.id}
          locale={locale}
          initialLikeCount={data.likeMeta.likeCount}
          initialLikedByMe={data.likeMeta.likedByMe}
          toggleLikeAction={toggleLike}
        />
      </div>
    </FeedItemCard>
  );
});
