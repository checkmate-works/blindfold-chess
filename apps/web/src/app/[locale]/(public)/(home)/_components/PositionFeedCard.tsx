'use client';

import { memo } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { getPositionDetailPath } from '@/lib/positions/routes';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { resolveDisplayName } from '@/lib/users/display-name';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/_actions/toggleLike';
import { PostFooter } from '@/app/[locale]/(public)/topics/_components/PostFooter';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { PositionFeedData } from '../_lib/types';

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
  const { preferences } = useGamePreferences();
  const displayName = resolveDisplayName(data.author);
  // Resolve the correct detail-page path based on the position's `type`.
  // Returns `null` for types without a detail page (e.g. `sequence`), in
  // which case the permalink slot renders a non-link <time>.
  const href = getPositionDetailPath(data.type, data.id);

  const time = (
    <time dateTime={data.createdAt}>
      {formatRelativeTime(new Date(data.createdAt), locale, justNowLabel)}
    </time>
  );

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
        href ? (
          <Link
            href={href}
            locale={locale}
            className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {time}
          </Link>
        ) : (
          time
        )
      }
      footer={
        href ? (
          <PostFooter
            postId={data.id}
            locale={locale}
            topicKey={data.id}
            likeMeta={data.likeMeta}
            replyMeta={data.replyMeta}
            toggleLikeAction={toggleLike}
            i18nNamespace={data.type === 'puzzle' ? 'practice.puzzle' : 'practice.positionMemory'}
            postHref={href}
          />
        ) : undefined
      }
    >
      <p className="text-sm text-foreground mt-1">{tFeed('action')}</p>
    </ActivityCard>
  );
});
