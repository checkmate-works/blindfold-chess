'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import {
  AttachedEmbedCard,
  AttachedGameCard,
  BaseTopicPostCard,
} from '@/app/[locale]/(public)/topics/_components';
import type {
  AttachedEmbedCardData,
  AttachedGameCardData,
} from '@/app/[locale]/(public)/topics/_components';
import type { PostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

import { toggleChunkLike } from '../_actions/toggleChunkLike';

/**
 * Per-post attachment payload. Matches the discriminated union returned
 * by `getAttachmentsForPosts`. SPEC2 Phase B introduces the embed
 * variant alongside the existing PGN variant.
 */
export type PostAttachment =
  | { kind: 'pgn'; data: AttachedGameCardData }
  | { kind: 'embed'; data: AttachedEmbedCardData };

type Props = {
  post: PostWithReplyMeta;
  locale: string;
  slug: string;
  attachment: PostAttachment | null;
};

export function PostCard({ post, locale, slug, attachment }: Props) {
  const t = useTranslations('topics.chunks');

  const extraContent = attachment ? (
    attachment.kind === 'pgn' ? (
      <AttachedGameCard attachment={attachment.data} />
    ) : (
      <AttachedEmbedCard attachment={attachment.data} />
    )
  ) : undefined;

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
      extraContent={extraContent}
    />
  );
}
