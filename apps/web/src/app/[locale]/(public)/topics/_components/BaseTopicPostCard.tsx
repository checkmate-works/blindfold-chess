'use client';

import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { truncateContent } from '@/lib/truncate-content';

import { LinkedText } from '@/app/[locale]/_components';

import type { LikeMeta, ReplyMeta } from '../_lib/queries';
import { formatRelativeTime } from '../_lib/relative-time';
import { PostFooter } from './PostFooter';
import { UserAvatar } from './UserAvatar';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type Props = {
  postId: string;
  postHref: string;
  content: string;
  createdAt: Date;
  author: {
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    flair: string | null;
    country: string | null;
  } | null;
  locale: string;
  topicKey: string;
  likeMeta: LikeMeta;
  replyMeta: ReplyMeta;
  toggleLikeAction: ToggleLikeAction;
  i18nNamespace: string;
  justNowLabel: string;
  badge?: ReactNode;
  extraContent?: ReactNode;
};

export function BaseTopicPostCard({
  postId,
  postHref,
  content,
  createdAt,
  author,
  locale,
  topicKey,
  likeMeta,
  replyMeta,
  toggleLikeAction,
  i18nNamespace,
  justNowLabel,
  badge,
  extraContent,
}: Props) {
  const tTopics = useTranslations('topics');
  const displayName = author?.displayName || author?.username || 'Anonymous';
  const profileHref = author?.username ? `/u/${author.username}` : null;
  const hasContent = content.length > 0;
  const contentPreview = truncateContent(content);
  const isTruncated = contentPreview !== content;

  return (
    <Link
      href={postHref}
      locale={locale}
      className="block p-4 rounded-md border border-border bg-card hover:border-foreground/20 transition-colors"
    >
      <UserAvatar
        profileHref={profileHref}
        avatarUrl={author?.avatarUrl}
        displayName={displayName}
        locale={locale}
        asLink={false}
        flair={author?.flair}
        country={author?.country}
      >
        <div className="text-sm text-muted-foreground mb-4">
          <time dateTime={createdAt.toISOString()}>
            {formatRelativeTime(new Date(createdAt), locale, justNowLabel)}
          </time>
          {badge}
        </div>
        {extraContent}
        {hasContent && (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-3">
            <LinkedText text={contentPreview} locale={locale} />
          </p>
        )}
        {hasContent && isTruncated && (
          <span className="text-sm text-link-primary hover:underline">{tTopics('showMore')}</span>
        )}
      </UserAvatar>

      <PostFooter
        postId={postId}
        locale={locale}
        topicKey={topicKey}
        likeMeta={likeMeta}
        replyMeta={replyMeta}
        toggleLikeAction={toggleLikeAction}
        i18nNamespace={i18nNamespace}
      />
    </Link>
  );
}
