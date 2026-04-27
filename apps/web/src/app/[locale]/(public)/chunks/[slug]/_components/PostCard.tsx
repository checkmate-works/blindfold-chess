'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BaseTopicPostCard } from '@/app/[locale]/(public)/topics/_components';
import type { PostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

import { toggleChunkLike } from '../_actions/toggleChunkLike';

type Props = {
  post: PostWithReplyMeta;
  locale: string;
  slug: string;
};

export function PostCard({ post, locale, slug }: Props) {
  const t = useTranslations('topics.chunks');

  return (
    <BaseTopicPostCard
      postId={post.id}
      postHref={`/chunks/${slug}/posts/${post.id}`}
      content={post.content}
      createdAt={post.createdAt}
      author={post.author}
      locale={locale}
      topicKey={slug}
      likeMeta={post.likeMeta}
      replyMeta={post.replyMeta}
      toggleLikeAction={toggleChunkLike}
      i18nNamespace="topics.chunks"
      justNowLabel={t('justNow')}
    />
  );
}
