'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BaseTopicPostCard } from '@/app/[locale]/(public)/topics/_components';
import type { PostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

import { togglePositionPuzzlePostLike } from '../_actions/togglePositionPuzzlePostLike';

type Props = {
  post: PostWithReplyMeta;
  locale: string;
  positionId: string;
};

export function PostCard({ post, locale, positionId }: Props) {
  const t = useTranslations('topics.positionPuzzle');

  return (
    <BaseTopicPostCard
      postId={post.id}
      postHref={`/practice/puzzle/${positionId}#post-${post.id}`}
      content={post.content}
      createdAt={post.createdAt}
      author={post.author}
      locale={locale}
      topicKey={positionId}
      likeMeta={post.likeMeta}
      replyMeta={post.replyMeta}
      toggleLikeAction={togglePositionPuzzlePostLike}
      i18nNamespace="topics.positionPuzzle"
      justNowLabel={t('justNow')}
      isSpoiler={post.isSpoiler}
      expandInline
    />
  );
}
