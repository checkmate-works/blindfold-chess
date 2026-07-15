'use client';

import { memo } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { resolveDisplayName } from '@/lib/users/display-name';

import { toggleGameLikeAction } from '@/app/[locale]/(public)/games/shared/[id]/_actions/game-like';
import { PostFooter } from '@/app/[locale]/(public)/topics/_components/PostFooter';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import type { LikeToggleButtonSize } from '@/app/[locale]/_components/LikeToggleButton';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { GameFeedData } from '../_lib/types';

type Props = {
  data: GameFeedData;
  locale: string;
  justNowLabel: string;
  /** Like button size variant, forwarded to `PostFooter`. */
  likeSize?: LikeToggleButtonSize;
};

export const GameFeedCard = memo(function GameFeedCard({
  data,
  locale,
  justNowLabel,
  likeSize,
}: Props) {
  const tFeed = useTranslations('home.feed.game');
  const { preferences } = useGamePreferences();
  const displayName = resolveDisplayName(data.author);
  const href = `/games/shared/${data.id}`;

  return (
    <ActivityCard
      href={href}
      locale={locale}
      thumbnail={
        <BoardThumbnail
          fen={data.fen}
          className="w-full h-full"
          boardTheme={preferences.boardTheme}
        />
      }
      author={
        <UserAvatar
          profileHref={data.author?.username ? `/u/${data.author.username}` : null}
          avatarUrl={data.author?.avatarUrl}
          displayName={displayName}
          locale={locale}
          size="sm"
          flair={data.author?.flair}
          country={data.author?.country}
        />
      }
      permalink={
        <Link
          href={href}
          locale={locale}
          className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <time dateTime={data.createdAt}>
            {formatRelativeTime(new Date(data.createdAt), locale, justNowLabel)}
          </time>
        </Link>
      }
      footer={
        <PostFooter
          postId={data.id}
          locale={locale}
          topicKey=""
          likeMeta={data.likeMeta}
          replyMeta={data.replyMeta}
          toggleLikeAction={toggleGameLikeAction}
          i18nNamespace="sharedGames.detail"
          postHref={href}
          likeSize={likeSize}
        />
      }
    >
      <p className="text-sm text-foreground mt-1">{tFeed('action')}</p>
      <p className="text-sm font-medium text-foreground line-clamp-1">
        <Link
          href={href}
          locale={locale}
          className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {data.title}
        </Link>
      </p>
    </ActivityCard>
  );
});
