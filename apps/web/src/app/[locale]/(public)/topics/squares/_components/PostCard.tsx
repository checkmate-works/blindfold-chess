'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Link } from '@/i18n/routing';

import type { PostWithReplyMeta } from '../_lib/queries';
import { formatRelativeTime } from '../_lib/relative-time';
import { LikeButton } from './LikeButton';
import { UserAvatar } from './UserAvatar';

type Props = {
  post: PostWithReplyMeta;
  locale: string;
  square: string;
  showSquareBadge?: boolean;
};

export function PostCard({ post, locale, square, showSquareBadge = false }: Props) {
  const t = useTranslations('topics.squares');
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const contentPreview =
    post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content;
  const profileHref = post.author?.username ? `/@/${post.author.username}` : null;

  return (
    <Link
      href={`/topics/squares/${square}/posts/${post.id}`}
      locale={locale}
      className="block p-4 rounded-md border border-border bg-card hover:border-foreground/20 transition-colors"
    >
      <UserAvatar
        profileHref={profileHref}
        avatarUrl={post.author?.avatarUrl}
        displayName={displayName}
        locale={locale}
        asLink={false}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          {showSquareBadge && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-muted text-muted-foreground">
              {square}
            </span>
          )}
          <span>·</span>
          <time dateTime={post.createdAt.toISOString()}>
            {post.createdAt.toLocaleDateString(locale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{contentPreview}</p>

        <div className="mt-2">
          <LikeButton
            postId={post.id}
            locale={locale}
            square={square}
            initialLikeCount={post.likeMeta.likeCount}
            initialLikedByMe={post.likeMeta.likedByMe}
          />
        </div>
      </UserAvatar>

      {post.replyMeta.replyCount > 0 && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
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
          </div>
          <span className="text-xs text-muted-foreground">
            {t('replyCount', { count: post.replyMeta.replyCount })}
          </span>
          {post.replyMeta.latestReplyAt && (
            <span className="text-xs text-muted-foreground ml-auto">
              {t('newReply', {
                time: formatRelativeTime(post.replyMeta.latestReplyAt, locale, t('justNow')),
              })}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
