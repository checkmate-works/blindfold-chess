'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

import { truncateContent } from '../../topics/_lib/truncate-content';
import { UserAvatar } from '../../topics/squares/_components/UserAvatar';
import type { PostWithReplyMeta } from '../../topics/squares/_lib/queries';
import { formatRelativeTime } from '../../topics/squares/_lib/relative-time';
import { TopicSquareBoard } from './TopicSquareBoard';

type Props = {
  post: PostWithReplyMeta;
  locale: string;
  topicKey: string;
};

export function TopicPostCard({ post, locale, topicKey }: Props) {
  const t = useTranslations('topics');
  const tSquares = useTranslations('topics.squares');
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const contentPreview = truncateContent(post.content);

  return (
    <Link
      href={`/topics/squares/${topicKey}/posts/${post.id}`}
      locale={locale}
      className="flex gap-4 p-4 rounded-lg border border-border bg-card hover:border-foreground/20 transition-colors"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
        <TopicSquareBoard square={topicKey} />
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
        <span className="text-sm text-link-primary mt-auto">{t('showMore')}</span>
      </div>
    </Link>
  );
}
