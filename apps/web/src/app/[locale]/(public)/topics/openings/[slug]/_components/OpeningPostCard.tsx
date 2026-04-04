'use client';

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
};

export function OpeningPostCard({ post, locale, slug, openingName }: Props) {
  const t = useTranslations('topics.openings');

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
      extraContent={
        post.rating ? (
          <div className="mb-2">
            <RatingDisplay
              preferenceRating={post.rating.preferenceRating}
              proficiencyRating={post.rating.proficiencyRating}
            />
          </div>
        ) : undefined
      }
    />
  );
}
