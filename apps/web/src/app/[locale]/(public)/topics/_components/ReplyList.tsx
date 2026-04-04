'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { truncateContent } from '@/lib/truncate-content';

import { LinkedText } from '@/app/[locale]/_components/LinkedText';

import type { PostWithReplyMeta } from '../_lib/queries';
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
};

function ReplyContent({ content, locale }: { content: string; locale: string }) {
  const t = useTranslations('topics');
  const truncated = truncateContent(content);
  const isTruncated = truncated !== content;
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="text-foreground whitespace-pre-wrap break-words text-sm leading-relaxed">
        <LinkedText text={expanded ? content : truncated} locale={locale} />
      </div>
      {isTruncated && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm text-link-primary hover:underline"
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
}: Props) {
  const t = useTranslations(replyI18nNamespace);

  return (
    <div className="space-y-4">
      {replies.map((reply) => {
        const displayName = reply.author?.displayName || reply.author?.username || 'Anonymous';
        const profileHref = reply.author?.username ? `/@/${reply.author.username}` : null;
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
            <ReplyContent content={reply.content} locale={locale} />
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
