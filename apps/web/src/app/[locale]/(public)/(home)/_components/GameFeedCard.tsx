'use client';

import { memo } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { buildProfileHref } from '@/lib/users/author-profile';
import { resolveDisplayName } from '@/lib/users/display-name';

import { toggleGameLikeAction } from '@/app/[locale]/(public)/games/shared/[id]/_actions/game-like';
import { AiReviewedBadge } from '@/app/[locale]/(public)/games/shared/_components/AiReviewedBadge';
import { PostFooter } from '@/app/[locale]/(public)/topics/_components/PostFooter';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import type { EngagementCounterSize } from '@/app/[locale]/_components/EngagementCounter';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { GameFeedData } from '../_lib/types';

type Props = {
  data: GameFeedData;
  locale: string;
  justNowLabel: string;
  /** Size variant for the footer engagement actions (like + comment counter), forwarded to `PostFooter`. */
  actionSize?: EngagementCounterSize;
};

export const GameFeedCard = memo(function GameFeedCard({
  data,
  locale,
  justNowLabel,
  actionSize,
}: Props) {
  const tFeed = useTranslations('home.feed.game');
  const tSharedGames = useTranslations('sharedGames');
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
          displaySettings={data.thumbnailDisplay}
        />
      }
      author={
        <UserAvatar
          profileHref={buildProfileHref(data.author)}
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
          // Comment icon scrolls straight to the overview/discussion block
          // (`id="game-overview"`); the rest of the card keeps linking to
          // the plain detail page (opening board).
          postHref={`${href}#game-overview`}
          actionSize={actionSize}
        />
      }
    >
      <p className="text-sm text-foreground mt-1">{tFeed('action')}</p>
      {/* Title and badge share a row, as they do on the CatalogListCard
          surfaces; `min-w-0` + `truncate` keep a long title from pushing the
          chip out of the card. */}
      <div className="flex items-center gap-2 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          <Link
            href={href}
            locale={locale}
            className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {data.title}
          </Link>
        </p>
        <AiReviewedBadge reviewed={data.aiReviewed} label={tSharedGames('list.aiReviewedBadge')} />
      </div>
    </ActivityCard>
  );
});
