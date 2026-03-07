'use client';

import Image from 'next/image';

import { LikeButton } from '../../../../_components';
import type { PostWithReplyMeta } from '../../../../_lib/queries';

type Props = {
  replies: PostWithReplyMeta[];
  locale: string;
  square: string;
};

export function ReplyList({ replies, locale, square }: Props) {
  return (
    <div className="space-y-4">
      {replies.map((reply) => {
        const displayName = reply.author?.displayName || reply.author?.username || 'Anonymous';
        return (
          <div key={reply.id} className="p-4 bg-card border border-border rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              {reply.author?.avatarUrl ? (
                <Image
                  src={reply.author.avatarUrl}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-foreground text-sm">{displayName}</span>
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
              </div>
            </div>
            <div className="text-foreground whitespace-pre-wrap break-words text-sm leading-relaxed">
              {reply.content}
            </div>
            <LikeButton
              postId={reply.id}
              locale={locale}
              square={square}
              initialLikeCount={reply.likeMeta.likeCount}
              initialLikedByMe={reply.likeMeta.likedByMe}
            />
          </div>
        );
      })}
    </div>
  );
}
