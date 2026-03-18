'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { getStartingFen } from '@blindfold-chess/features/chess-core';

import { truncateContent } from '@/lib/truncate-content';

import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/queries';
import { MiniBoard } from '@/app/[locale]/(public)/topics/openings/_components/MiniBoard';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/squares/_lib/relative-time';

import { TopicSquareBoard } from './TopicSquareBoard';

type Props = {
  post: ProfilePostWithReplyMeta;
  locale: string;
};

export function TopicPostCard({ post, locale }: Props) {
  const t = useTranslations('topics');
  const tSquares = useTranslations('topics.squares');
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const contentPreview = truncateContent(post.content);
  const isOpening = post.topicType === 'opening';

  const href = isOpening
    ? `/topics/openings/${post.topicKey}/posts/${post.id}`
    : `/topics/squares/${post.topicKey}/posts/${post.id}`;

  return (
    <Link
      href={href}
      locale={locale}
      className="flex gap-4 p-4 rounded-lg border border-border bg-card hover:border-foreground/20 transition-colors"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
        {isOpening ? (
          <MiniBoard fen={post.openingFen ?? getStartingFen()} responsive />
        ) : (
          <TopicSquareBoard square={post.topicKey} />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <UserAvatar
          profileHref={null}
          avatarUrl={post.author?.avatarUrl}
          displayName={displayName}
          locale={locale}
          size="sm"
          flair={post.author?.flair}
          country={post.author?.country}
        />
        <p className="text-sm text-foreground break-words line-clamp-3">{contentPreview}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <time dateTime={post.createdAt.toISOString()}>
            {formatRelativeTime(new Date(post.createdAt), locale, tSquares('justNow'))}
          </time>
        </div>
        {isOpening ? (
          post.openingName && (
            <span className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
              {post.openingName}
            </span>
          )
        ) : (
          <span className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-muted text-muted-foreground">
            {post.topicKey}
          </span>
        )}
        <span className="text-sm text-link-primary mt-auto">{t('showMore')}</span>
      </div>
    </Link>
  );
}
