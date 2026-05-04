'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import {
  AttachedEmbedCard,
  AttachedFenCard,
  AttachedGameCard,
  AttachedImageCard,
  AttachedVideoCard,
  BaseTopicPostCard,
} from '@/app/[locale]/(public)/topics/_components';
import type { PostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

import { toggleChunkLike } from '../_actions/toggleChunkLike';

type Props = {
  post: PostWithReplyMeta;
  locale: string;
  slug: string;
  attachment: PostAttachment | null;
};

function renderAttachment(attachment: PostAttachment, fallbackVideoTitle: string) {
  switch (attachment.kind) {
    case 'pgn':
      return <AttachedGameCard attachment={attachment.data} />;
    case 'embed':
      return <AttachedEmbedCard attachment={attachment.data} />;
    case 'image':
      return <AttachedImageCard attachments={attachment.data} />;
    case 'fen':
      return <AttachedFenCard attachment={attachment.data} />;
    case 'video':
      return <AttachedVideoCard attachment={attachment.data} fallbackTitle={fallbackVideoTitle} />;
    default: {
      // Compile-time exhaustiveness guard. Adding a new PostAttachment
      // kind without a matching case above will fail this assignment.
      const _exhaustive: never = attachment;
      void _exhaustive;
      return null;
    }
  }
}

export function PostCard({ post, locale, slug, attachment }: Props) {
  const t = useTranslations('topics.chunks');
  const tVideo = useTranslations('postVideoAttachmentRender');

  const extraContent = attachment
    ? renderAttachment(attachment, tVideo('fallbackTitle'))
    : undefined;

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
