'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

import { truncateContent } from '@/lib/truncate-content';

import { PostFooter } from '@/app/[locale]/(public)/topics/_components/PostFooter';
import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';

import type { OpeningPostWithReplyMeta } from '../../_lib/queries';
import { toggleLike } from '../posts/[postId]/_actions/toggleLike';
import { RatingDisplay } from './RatingDisplay';

type Props = {
  post: OpeningPostWithReplyMeta;
  locale: string;
  slug: string;
  openingName?: string | null;
};

export function OpeningPostCard({ post, locale, slug, openingName }: Props) {
  const tTopics = useTranslations('topics');
  const t = useTranslations('topics.openings');
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const profileHref = post.author?.username ? `/@/${post.author.username}` : null;
  const hasContent = post.content.length > 0;
  const contentPreview = truncateContent(post.content);
  const isTruncated = contentPreview !== post.content;
  const [expanded, setExpanded] = useState(false);

  return (
    <Link
      href={`/topics/openings/${slug}/posts/${post.id}`}
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
          {openingName && (
            <div className="mt-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
                {openingName}
              </span>
            </div>
          )}
        </div>
        {post.rating && (
          <div className="mb-2">
            <RatingDisplay
              preferenceRating={post.rating.preferenceRating}
              proficiencyRating={post.rating.proficiencyRating}
            />
          </div>
        )}
        {hasContent && (
          <p
            className={`text-sm text-foreground whitespace-pre-wrap break-words${expanded ? '' : ' line-clamp-3'}`}
          >
            {expanded ? post.content : contentPreview}
          </p>
        )}
        {hasContent && isTruncated && (
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
        topicKey={slug}
        likeMeta={post.likeMeta}
        replyMeta={post.replyMeta}
        toggleLikeAction={toggleLike}
        i18nNamespace="topics.openings"
      />
    </Link>
  );
}
