'use client';

import { memo } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { buildProfileHref } from '@/lib/users/author-profile';
import { resolveAuthorName } from '@/lib/users/display-name';

import { toggleLike } from '@/app/[locale]/(public)/chunks/_actions/toggleLike';
import { PostFooter } from '@/app/[locale]/(public)/topics/_components/PostFooter';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import type { EngagementCounterSize } from '@/app/[locale]/_components/EngagementCounter';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { ChunkFeedData } from '../_lib/types';

type Props = {
  data: ChunkFeedData;
  createdAt: string;
  locale: string;
  justNowLabel: string;
  /** ActivityCard layout: `'feed'` (divider list, default) or `'card'` (stand-alone card). */
  variant?: 'feed' | 'card';
  /** Size variant for the footer engagement actions (like + comment counter), forwarded to `PostFooter`. */
  actionSize?: EngagementCounterSize;
};

export const ChunkFeedCard = memo(function ChunkFeedCard({
  data,
  createdAt,
  locale,
  justNowLabel,
  variant,
  actionSize,
}: Props) {
  const tFeed = useTranslations('home.feed.chunk');
  const tCommon = useTranslations('Common');
  const { preferences } = useGamePreferences();
  const displayName = resolveAuthorName(data.author, { fallback: tCommon('deletedUser') });
  const href = `/chunks/${data.slug}`;

  const time = (
    <time dateTime={createdAt}>
      {formatRelativeTime(new Date(createdAt), locale, justNowLabel)}
    </time>
  );

  return (
    <ActivityCard
      variant={variant}
      href={href}
      locale={locale}
      thumbnail={
        <BoardThumbnail
          fen={data.representativeFen}
          annotations={data.annotations}
          className="w-full h-full"
          boardTheme={preferences.boardTheme}
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
          i18nNamespace="topics.chunks"
          // Comment icon opens the Comments tab and scrolls to the tab bar
          // (`id="chunk-tabs"`); the rest of the card keeps linking to the
          // plain detail page (default tab).
          postHref={`${href}?tab=comments#chunk-tabs`}
          actionSize={actionSize}
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
