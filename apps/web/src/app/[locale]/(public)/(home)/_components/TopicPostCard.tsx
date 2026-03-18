'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Link } from '@/i18n/routing';
import { getStartingFen } from '@blindfold-chess/features/chess-core';
import { FaRegComment } from 'react-icons/fa';

import { truncateContent } from '@/lib/truncate-content';

import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/queries';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { toggleLike as toggleLikeOpening } from '@/app/[locale]/(public)/topics/openings/[slug]/posts/[postId]/_actions/toggleLike';
import { MiniBoard } from '@/app/[locale]/(public)/topics/openings/_components/MiniBoard';
import { toggleLike as toggleLikeSquare } from '@/app/[locale]/(public)/topics/squares/[square]/posts/[postId]/_actions/toggleLike';

import { TopicSquareBoard } from './TopicSquareBoard';

type Props = {
  post: ProfilePostWithReplyMeta;
  locale: string;
};

export function TopicPostCard({ post, locale }: Props) {
  const tTopics = useTranslations('topics');
  const tSquares = useTranslations('topics.squares');
  const tOpenings = useTranslations('topics.openings');
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const contentPreview = truncateContent(post.content);
  const isTruncated = contentPreview !== post.content;
  const [expanded, setExpanded] = useState(false);
  const isOpening = post.topicType === 'opening';

  const href = isOpening
    ? `/topics/openings/${post.topicKey}/posts/${post.id}`
    : `/topics/squares/${post.topicKey}/posts/${post.id}`;

  const tTopic = isOpening ? tOpenings : tSquares;

  return (
    <Link
      href={href}
      locale={locale}
      className="flex gap-4 p-4 rounded-lg border border-border bg-card hover:border-foreground/20 transition-colors"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
        {isOpening ? (
          <MiniBoard fen={post.openingFen ?? getStartingFen()} responsive />
        ) : (
          <TopicSquareBoard square={post.topicKey} />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
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
            {formatRelativeTime(new Date(post.createdAt), locale, tTopic('justNow'))}
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
        <p className={`text-sm text-foreground break-words mt-3${expanded ? '' : ' line-clamp-3'}`}>
          {expanded ? post.content : contentPreview}
        </p>
        {isTruncated && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            className="text-sm text-link-primary hover:underline"
          >
            {expanded ? tTopics('showLess') : tTopics('showMore')}
          </button>
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
                      className="rounded-full border-2 border-card"
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
                  {tTopic('newReply', {
                    time: formatRelativeTime(
                      post.replyMeta.latestReplyAt,
                      locale,
                      tTopic('justNow')
                    ),
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
