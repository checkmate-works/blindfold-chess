'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { truncateContent } from '@/lib/truncate-content';

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
};

function ReplyContent({ content }: { content: string }) {
  const t = useTranslations('topics');
  const truncated = truncateContent(content);
  const isTruncated = truncated !== content;
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="text-foreground whitespace-pre-wrap break-words text-sm leading-relaxed">
        {expanded ? content : truncated}
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

export function ReplyList({
  replies,
  locale,
  topicKey,
  toggleLikeAction,
  likeI18nNamespace,
}: Props) {
  return (
    <div className="space-y-4">
      {replies.map((reply) => {
        const displayName = reply.author?.displayName || reply.author?.username || 'Anonymous';
        const profileHref = reply.author?.username ? `/@/${reply.author.username}` : null;

        return (
          <div key={reply.id} className="p-4 bg-card border border-border rounded-lg space-y-3">
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
            <ReplyContent content={reply.content} />
            <LikeButton
              postId={reply.id}
              locale={locale}
              topicKey={topicKey}
              initialLikeCount={reply.likeMeta.likeCount}
              initialLikedByMe={reply.likeMeta.likedByMe}
              toggleLikeAction={toggleLikeAction}
              i18nNamespace={likeI18nNamespace}
            />
          </div>
        );
      })}
    </div>
  );
}
