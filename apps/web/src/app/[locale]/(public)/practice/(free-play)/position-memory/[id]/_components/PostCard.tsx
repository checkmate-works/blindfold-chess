'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BaseTopicPostCard } from '@/app/[locale]/(public)/topics/_components';
import type { PostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

import { togglePositionMemoryPostLike } from '../_actions/togglePositionMemoryPostLike';

type Props = {
  post: PostWithReplyMeta;
  locale: string;
  positionId: string;
};

export function PostCard({ post, locale, positionId }: Props) {
  const t = useTranslations('topics.positionMemory');

  return (
    <BaseTopicPostCard
      postId={post.id}
      postHref={`/practice/position-memory/${positionId}#post-${post.id}`}
      content={post.content}
      createdAt={post.createdAt}
      author={post.author}
      locale={locale}
      topicKey={positionId}
      likeMeta={post.likeMeta}
      replyMeta={post.replyMeta}
      toggleLikeAction={togglePositionMemoryPostLike}
      i18nNamespace="topics.positionMemory"
      justNowLabel={t('justNow')}
      expandInline
    />
  );
}
