'use client';

import type { ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BaseTopicPostCard } from '@/app/[locale]/(public)/topics/_components';

import { toggleLike } from '../[square]/posts/[postId]/_actions/toggleLike';
import type { PostWithReplyMeta } from '../_lib/queries';

type Props = {
  post: PostWithReplyMeta;
  locale: string;
  square: string;
  showSquareBadge?: boolean;
  /**
   * Pre-rendered attachment slot (e.g. an `<AttachedGameCard />`).
   * Server pages resolve `getAttachmentsForPosts` + `renderAttachment`
   * upstream and hand the ReactNode here, since `getAttachmentsForPosts`
   * is server-only and PostCard is a client component. Unused when the
   * post has no attachment row.
   */
  attachment?: ReactNode;
};

export function PostCard({ post, locale, square, showSquareBadge = false, attachment }: Props) {
  const t = useTranslations('topics.squares');

  return (
    <BaseTopicPostCard
      postId={post.id}
      postHref={`/topics/squares/${square}/posts/${post.id}`}
      commentHref={`/topics/squares/${square}/posts/${post.id}#comments`}
      content={post.content}
      createdAt={post.createdAt}
      author={post.author}
      locale={locale}
      topicKey={square}
      likeMeta={post.likeMeta}
      replyMeta={post.replyMeta}
      toggleLikeAction={toggleLike}
      i18nNamespace="topics.squares"
      justNowLabel={t('justNow')}
      badge={
        showSquareBadge ? (
          <div className="mt-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-muted text-muted-foreground">
              {square}
            </span>
          </div>
        ) : undefined
      }
      extraContent={attachment}
    />
  );
}
