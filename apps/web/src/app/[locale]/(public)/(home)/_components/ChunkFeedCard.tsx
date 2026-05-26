'use client';

import { memo } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { resolveDisplayName } from '@/lib/users/display-name';

import { toggleLike } from '@/app/[locale]/(public)/chunks/_actions/toggleLike';
import { PostFooter } from '@/app/[locale]/(public)/topics/_components/PostFooter';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { ChunkFeedData } from '../_lib/types';

type Props = {
  data: ChunkFeedData;
  createdAt: string;
  locale: string;
  justNowLabel: string;
};

export const ChunkFeedCard = memo(function ChunkFeedCard({
  data,
  createdAt,
  locale,
  justNowLabel,
}: Props) {
  const tFeed = useTranslations('home.feed.chunk');
  const { preferences } = useGamePreferences();
  const displayName = resolveDisplayName(data.author);
  const href = `/chunks/${data.slug}`;

  const time = (
    <time dateTime={createdAt}>
      {formatRelativeTime(new Date(createdAt), locale, justNowLabel)}
    </time>
  );

  return (
    <ActivityCard
      href={href}
      locale={locale}
      thumbnail={
        <BoardThumbnail
          fen={data.representativeFen}
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
          {time}
        </Link>
      }
      footer={
        <PostFooter
          postId={data.id}
          locale={locale}
          topicKey={data.slug}
          likeMeta={data.likeMeta}
          replyMeta={data.replyMeta}
          toggleLikeAction={toggleLike}
          i18nNamespace="chunks"
          postHref={href}
        />
      }
    >
      <p className="text-sm text-foreground mt-1">
        {data.kind === 'published' ? tFeed('action.published') : tFeed('action.created')}
      </p>
      <p className="text-base font-medium text-foreground mt-1 line-clamp-1">{data.title}</p>
    </ActivityCard>
  );
});
