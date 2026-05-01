'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaEyeSlash } from 'react-icons/fa';

import { truncateContent } from '@/lib/content/truncate-content';

import { LinkedText } from '@/app/[locale]/_components/LinkedText';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import type { PostWithReplyMeta } from '../_lib/shared';
import { LikeButton } from './LikeButton';
import { UserAvatar } from './UserAvatar';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type Props = {
  replies: PostWithReplyMeta[];
  locale: string;
  topicKey: string;
  toggleLikeAction: ToggleLikeAction;
  likeI18nNamespace: string;
  replyI18nNamespace: string;
  onReplyClick?: (replyId: string, username: string) => void;
  /**
   * When `true`, replies whose `isSpoiler` flag is set are rendered behind a
   * click-to-reveal overlay matching `BaseTopicPostCard`. Unflagged replies
   * render normally. Surfaced only by `topic_type='position_puzzle'` today.
   */
  enableSpoiler?: boolean;
};

function ReplyContent({
  content,
  locale,
  isSpoiler,
}: {
  content: string;
  locale: string;
  isSpoiler: boolean;
}) {
  const t = useTranslations('topics');
  const truncated = truncateContent(content);
  const isTruncated = truncated !== content;
  const [expanded, setExpanded] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const showOverlay = isSpoiler && !isRevealed;

  return (
    <>
      <div className="relative" aria-live="polite">
        <div
          className="text-foreground whitespace-pre-wrap break-words text-sm leading-relaxed"
          aria-hidden={showOverlay || undefined}
        >
          <LinkedText text={expanded ? content : truncated} locale={locale} />
        </div>
        {showOverlay && (
          <button
            type="button"
            onClick={() => setIsRevealed(true)}
            aria-label={t('spoiler.overlayAriaLabel')}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-sm bg-muted text-muted-foreground hover:bg-muted/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <FaEyeSlash aria-hidden="true" />
              {t('spoiler.overlayTitle')}
            </span>
            <span className="text-xs text-muted-foreground/80">{t('spoiler.overlayHint')}</span>
          </button>
        )}
      </div>
      {isTruncated && !expanded && !showOverlay && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`text-sm ${TEXT_LINK_CLASSES}`}
        >
          {t('showMore')}
        </button>
      )}
    </>
  );
}

function resolveParentAuthor(
  reply: PostWithReplyMeta,
  replies: PostWithReplyMeta[]
): string | null {
  if (!reply.parentId || reply.parentId === reply.rootPostId) {
    return null;
  }
  const parent = replies.find((r) => r.id === reply.parentId);
  if (!parent) return null;
  return parent.author?.displayName || parent.author?.username || 'Anonymous';
}

export function ReplyList({
  replies,
  locale,
  topicKey,
  toggleLikeAction,
  likeI18nNamespace,
  replyI18nNamespace,
  onReplyClick,
  enableSpoiler = false,
}: Props) {
  const t = useTranslations(replyI18nNamespace);

  return (
    <div className="space-y-4">
      {replies.map((reply) => {
        const displayName = reply.author?.displayName || reply.author?.username || 'Anonymous';
        const profileHref = reply.author?.username ? `/u/${reply.author.username}` : null;
        const mentionName = resolveParentAuthor(reply, replies);

        return (
          <div
            key={reply.id}
            id={`reply-${reply.id}`}
            className="scroll-mt-20 p-4 bg-card border border-border rounded-lg space-y-3"
          >
            <UserAvatar
              profileHref={profileHref}
              avatarUrl={reply.author?.avatarUrl}
              displayName={displayName}
              locale={locale}
              flair={reply.author?.flair}
              country={reply.author?.country}
            >
              <time
                dateTime={reply.createdAt.toISOString()}
                className="text-xs text-muted-foreground"
              >
                {reply.createdAt.toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </UserAvatar>
            {mentionName && (
              <span className="text-sm font-medium text-primary">@{mentionName}</span>
            )}
            <ReplyContent
              content={reply.content}
              locale={locale}
              isSpoiler={enableSpoiler && reply.isSpoiler}
            />
            <div className="flex items-center gap-4">
              <LikeButton
                postId={reply.id}
                locale={locale}
                topicKey={topicKey}
                initialLikeCount={reply.likeMeta.likeCount}
                initialLikedByMe={reply.likeMeta.likedByMe}
                toggleLikeAction={toggleLikeAction}
                i18nNamespace={likeI18nNamespace}
              />
              {onReplyClick && (
                <button
                  type="button"
                  onClick={() =>
                    onReplyClick(
                      reply.id,
                      reply.author?.displayName || reply.author?.username || 'Anonymous'
                    )
                  }
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('replyButton')}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
