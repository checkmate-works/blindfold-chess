'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { AttachedGameCard, BaseTopicPostCard } from '@/app/[locale]/(public)/topics/_components';
import type { AttachedGameCardData } from '@/app/[locale]/(public)/topics/_components';
import type { PostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

import { toggleChunkLike } from '../_actions/toggleChunkLike';

type Props = {
  post: PostWithReplyMeta;
  locale: string;
  slug: string;
  attachment: AttachedGameCardData | null;
};

export function PostCard({ post, locale, slug, attachment }: Props) {
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
      extraContent={attachment ? <AttachedGameCard attachment={attachment} /> : undefined}
    />
  );
}
