'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

import { truncateContent } from '@/lib/truncate-content';

import { PostFooter } from '@/app/[locale]/(public)/topics/_components/PostFooter';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';

import { toggleLike } from '../[square]/posts/[postId]/_actions/toggleLike';
import type { PostWithReplyMeta } from '../_lib/queries';
import { UserAvatar } from './UserAvatar';

type Props = {
  post: PostWithReplyMeta;
  locale: string;
  square: string;
  showSquareBadge?: boolean;
};

export function PostCard({ post, locale, square, showSquareBadge = false }: Props) {
  const tTopics = useTranslations('topics');
  const t = useTranslations('topics.squares');
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const contentPreview = truncateContent(post.content);
  const isTruncated = contentPreview !== post.content;
  const [expanded, setExpanded] = useState(false);
  const profileHref = post.author?.username ? `/@/${post.author.username}` : null;

  return (
    <Link
      href={`/topics/squares/${square}/posts/${post.id}`}
      locale={locale}
      className="block p-4 rounded-md border border-border bg-card hover:border-foreground/20 transition-colors"
    >
      <UserAvatar
        profileHref={profileHref}
        avatarUrl={post.author?.avatarUrl}
        displayName={displayName}
        locale={locale}
        asLink={false}
        flair={post.author?.flair}
        country={post.author?.country}
      >
        <div className="text-sm text-muted-foreground mb-4">
          <time dateTime={post.createdAt.toISOString()}>
            {formatRelativeTime(new Date(post.createdAt), locale, t('justNow'))}
          </time>
          {showSquareBadge && (
            <div className="mt-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-muted text-muted-foreground">
                {square}
              </span>
            </div>
          )}
        </div>
        <p
          className={`text-sm text-foreground whitespace-pre-wrap break-words${expanded ? '' : ' line-clamp-3'}`}
        >
          {expanded ? post.content : contentPreview}
        </p>
        {isTruncated && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            className="text-sm text-link-primary hover:underline"
          >
            {expanded ? tTopics('showLess') : tTopics('showMore')}
          </button>
        )}
      </UserAvatar>

      <PostFooter
        postId={post.id}
        locale={locale}
        topicKey={square}
        likeMeta={post.likeMeta}
        replyMeta={post.replyMeta}
        toggleLikeAction={toggleLike}
        i18nNamespace="topics.squares"
      />
    </Link>
  );
}
