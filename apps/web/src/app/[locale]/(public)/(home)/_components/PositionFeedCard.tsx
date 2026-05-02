'use client';

import { memo } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { getPositionDetailPath } from '@/lib/positions/routes';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import { resolveDisplayName } from '@/lib/users/display-name';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_actions/toggleLike';
import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

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
  const { preferences } = useGamePreferences();
  const displayName = resolveDisplayName(data.author);
  // Resolve the correct detail-page path based on the position's `type`.
  // Returns `null` for types without a detail page (e.g. `sequence`), in
  // which case `FeedItemCard` renders the card as a non-interactive element.
  const href = getPositionDetailPath(data.type, data.id);

  // Layout note (HTML / a11y): FeedItemCard is rendered with `href={null}`
  // so the card body is NOT wrapped in an outer <a>. Wrapping it would
  // nest the inline <button> emitted by <LikeButton> and the inline <a>
  // emitted by <UserAvatar> when `profileHref` is set — both are invalid
  // HTML and produce hydration errors. The detail-page link is rendered
  // as a permalink anchor on the relative timestamp (Twitter / Mastodon /
  // GitHub pattern), keeping a crawler-discoverable <a href> per item.
  const time = (
    <time dateTime={data.createdAt}>
      {formatRelativeTime(new Date(data.createdAt), locale, justNowLabel)}
    </time>
  );

  return (
    <FeedItemCard
      href={null}
      locale={locale}
      thumbnail={
        <BoardThumbnail
          fen={data.fen}
          className="w-full h-full"
          boardTheme={preferences.boardTheme}
        />
      }
    >
      <UserAvatar
        profileHref={data.author?.username ? `/u/${data.author.username}` : null}
        avatarUrl={data.author?.avatarUrl}
        displayName={displayName}
        locale={locale}
        size="sm"
        flair={data.author?.flair}
        country={data.author?.country}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {href ? (
          <Link
            href={href}
            locale={locale}
            className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {time}
          </Link>
        ) : (
          time
        )}
      </div>
      <p className="text-sm text-foreground mt-1">{tFeed('action')}</p>

      <div className="flex items-center gap-4 mt-1 pt-2 border-t border-border">
        <LikeButton
          postId={data.id}
          locale={locale}
          topicKey=""
          initialLikeCount={data.likeMeta.likeCount}
          initialLikedByMe={data.likeMeta.likedByMe}
          toggleLikeAction={toggleLike}
          i18nNamespace="practice.positionMemory"
        />
      </div>
    </FeedItemCard>
  );
});
