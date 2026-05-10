'use client';

import type { ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BaseTopicPostCard } from '@/app/[locale]/(public)/topics/_components';

import type { OpeningPostWithReplyMeta } from '../../_lib/queries';
import { toggleLike } from '../posts/[postId]/_actions/toggleLike';
import { RatingDisplay } from './RatingDisplay';

type Props = {
  post: OpeningPostWithReplyMeta;
  locale: string;
  slug: string;
  openingName?: string | null;
  /**
   * Pre-rendered attachment slot (e.g. `<AttachedGameCard />`). Composed
   * with the optional `RatingDisplay` so a single `extraContent` slot
   * surfaces both the opening rating and any attached game / FEN /
   * embed card. Server pages resolve the ReactNode upstream because
   * `getAttachmentsForPosts` is server-only and OpeningPostCard is a
   * client component.
   */
  attachment?: ReactNode;
};

export function OpeningPostCard({ post, locale, slug, openingName, attachment }: Props) {
  const t = useTranslations('topics.openings');

  const rating = post.rating ? (
    <div className="mb-2">
      <RatingDisplay
        preferenceRating={post.rating.preferenceRating}
        proficiencyRating={post.rating.proficiencyRating}
      />
    </div>
  ) : null;

  // Compose rating + attachment into a single `extraContent` slot.
  // When neither is present pass `undefined` so BaseTopicPostCard does
  // not emit an empty wrapper that would create stray vertical space.
  const extraContent =
    rating || attachment ? (
      <>
        {rating}
        {attachment}
      </>
    ) : undefined;

  return (
    <BaseTopicPostCard
      postId={post.id}
      postHref={`/topics/openings/${slug}/posts/${post.id}`}
      content={post.content}
      createdAt={post.createdAt}
      author={post.author}
      locale={locale}
      topicKey={slug}
      likeMeta={post.likeMeta}
      replyMeta={post.replyMeta}
      toggleLikeAction={toggleLike}
      i18nNamespace="topics.openings"
      justNowLabel={t('justNow')}
      badge={
        openingName ? (
          <div className="mt-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
              {openingName}
            </span>
          </div>
        ) : undefined
      }
      extraContent={extraContent}
    />
  );
}
