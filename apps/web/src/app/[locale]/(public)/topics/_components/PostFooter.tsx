'use client';

import Image from 'next/image';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRegComment } from 'react-icons/fa';

import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';

import type { LikeMeta, ReplyMeta } from '../_lib/queries';
import { LikeButton } from './LikeButton';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type Props = {
  postId: string;
  locale: string;
  topicKey: string;
  likeMeta: LikeMeta;
  replyMeta: ReplyMeta;
  toggleLikeAction: ToggleLikeAction;
  i18nNamespace: string;
};

export function PostFooter({
  postId,
  locale,
  topicKey,
  likeMeta,
  replyMeta,
  toggleLikeAction,
  i18nNamespace,
}: Props) {
  const t = useTranslations(i18nNamespace);

  return (
    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
      <LikeButton
        postId={postId}
        locale={locale}
        topicKey={topicKey}
        initialLikeCount={likeMeta.likeCount}
        initialLikedByMe={likeMeta.likedByMe}
        toggleLikeAction={toggleLikeAction}
        i18nNamespace={i18nNamespace}
      />

      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <FaRegComment className="w-4 h-4" />
        {replyMeta.replyCount > 0 && <span>{replyMeta.replyCount}</span>}
      </div>

      {replyMeta.replyCount > 0 && (
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex -space-x-2">
            {replyMeta.repliers.map((replier, i) =>
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
            {replyMeta.uniqueReplierCount > replyMeta.repliers.length && (
              <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">
                  +{replyMeta.uniqueReplierCount - replyMeta.repliers.length}
                </span>
              </div>
            )}
          </div>
          {replyMeta.latestReplyAt && (
            <span className="text-xs text-muted-foreground">
              {t('newReply', {
                time: formatRelativeTime(replyMeta.latestReplyAt, locale, t('justNow')),
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
