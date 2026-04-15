'use client';

import { memo } from 'react';

import Image from 'next/image';

import { getStartingFen } from '@blindfold-chess/features/chess-core';
import { FaRegComment } from 'react-icons/fa';

import { truncateContent } from '@/lib/content/truncate-content';

import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/queries';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { RatingDisplay } from '@/app/[locale]/(public)/topics/openings/[slug]/_components/RatingDisplay';
import { toggleLike as toggleLikeOpening } from '@/app/[locale]/(public)/topics/openings/[slug]/posts/[postId]/_actions/toggleLike';
import { MiniBoard } from '@/app/[locale]/(public)/topics/openings/_components/MiniBoard';
import { isBlackOpening } from '@/app/[locale]/(public)/topics/openings/_lib/openings';
import { toggleLike as toggleLikeSquare } from '@/app/[locale]/(public)/topics/squares/[square]/posts/[postId]/_actions/toggleLike';
import { LinkedText } from '@/app/[locale]/_components';

import { FeedItemCard } from './FeedItemCard';
import { TopicSquareBoard } from './TopicSquareBoard';

type Props = {
  post: ProfilePostWithReplyMeta;
  locale: string;
  showMoreLabel: string;
  justNowLabel: string;
  newReplyTemplate: string;
  variant?: 'feed' | 'card';
};

export const TopicPostCard = memo(function TopicPostCard({
  post,
  locale,
  showMoreLabel,
  justNowLabel,
  newReplyTemplate,
  variant,
}: Props) {
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const contentPreview = truncateContent(post.content);
  const isTruncated = contentPreview !== post.content;
  const isOpening = post.topicType === 'opening';

  const isReply = post.rootPostId != null;
  const postId = isReply ? post.rootPostId : post.id;
  const anchor = isReply ? `#reply-${post.id}` : '';
  const href = isOpening
    ? `/topics/openings/${post.topicKey}/posts/${postId}${anchor}`
    : `/topics/squares/${post.topicKey}/posts/${postId}${anchor}`;

  return (
    <FeedItemCard
      href={href}
      locale={locale}
      variant={variant}
      thumbnail={
        isOpening ? (
          <MiniBoard
            fen={post.openingFen ?? getStartingFen()}
            responsive
            flipped={isBlackOpening(post.openingFen ?? getStartingFen())}
          />
        ) : (
          <TopicSquareBoard square={post.topicKey} />
        )
      }
    >
      <UserAvatar
        profileHref={null}
        avatarUrl={post.author?.avatarUrl}
        displayName={displayName}
        locale={locale}
        size="sm"
        flair={post.author?.flair}
        country={post.author?.country}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <time dateTime={post.createdAt.toISOString()}>
          {formatRelativeTime(new Date(post.createdAt), locale, justNowLabel)}
        </time>
      </div>
      {isOpening ? (
        post.openingName && (
          <span className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
            {post.openingName}
          </span>
        )
      ) : (
        <span className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-muted text-muted-foreground">
          {post.topicKey}
        </span>
      )}
      {isOpening && post.rating && (
        <div className="mb-1">
          <RatingDisplay
            preferenceRating={post.rating.preferenceRating}
            proficiencyRating={post.rating.proficiencyRating}
          />
        </div>
      )}
      <p className="text-sm text-foreground break-words mt-3 line-clamp-3">
        <LinkedText text={contentPreview} locale={locale} />
      </p>
      {isTruncated && (
        <span className="text-sm text-link-primary hover:underline">{showMoreLabel}</span>
      )}

      <div className="flex items-center gap-4 mt-1 pt-2 border-t border-border">
        <LikeButton
          postId={post.id}
          locale={locale}
          topicKey={post.topicKey}
          initialLikeCount={post.likeMeta.likeCount}
          initialLikedByMe={post.likeMeta.likedByMe}
          toggleLikeAction={isOpening ? toggleLikeOpening : toggleLikeSquare}
          i18nNamespace={isOpening ? 'topics.openings' : 'topics.squares'}
        />

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <FaRegComment className="w-4 h-4" />
          {post.replyMeta.replyCount > 0 && <span>{post.replyMeta.replyCount}</span>}
        </div>

        {post.replyMeta.replyCount > 0 && (
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex -space-x-2">
              {post.replyMeta.repliers.map((replier, i) =>
                replier.avatarUrl ? (
                  <Image
                    key={i}
                    src={replier.avatarUrl}
                    alt={replier.displayName}
                    width={24}
                    height={24}
                    className="rounded-full border-2 border-card object-cover w-6 h-6"
                    unoptimized
                  />
                ) : (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center"
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {replier.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )
              )}
              {post.replyMeta.uniqueReplierCount > post.replyMeta.repliers.length && (
                <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">
                    +{post.replyMeta.uniqueReplierCount - post.replyMeta.repliers.length}
                  </span>
                </div>
              )}
            </div>
            {post.replyMeta.latestReplyAt && (
              <span className="text-xs text-muted-foreground">
                {newReplyTemplate.replace(
                  '{time}',
                  formatRelativeTime(post.replyMeta.latestReplyAt, locale, justNowLabel)
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </FeedItemCard>
  );
});
