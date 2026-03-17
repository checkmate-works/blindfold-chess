'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Link } from '@/i18n/routing';
import { FaRegComment } from 'react-icons/fa';

import { truncateContent } from '@/lib/truncate-content';

import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/squares/_lib/relative-time';

import type { OpeningPostWithReplyMeta } from '../../_lib/queries';
import { RatingDisplay } from './RatingDisplay';

type Props = {
  post: OpeningPostWithReplyMeta;
  locale: string;
  slug: string;
};

export function OpeningPostCard({ post, locale, slug }: Props) {
  const tTopics = useTranslations('topics');
  const t = useTranslations('topics.openings');
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const profileHref = post.author?.username ? `/@/${post.author.username}` : null;
  const hasContent = post.content.length > 0;
  const contentPreview = truncateContent(post.content);

  return (
    <Link
      href={`/topics/openings/${slug}/posts/${post.id}`}
      locale={locale}
      className="block p-4 rounded-md border border-border bg-card hover:border-foreground/20 transition-colors"
    >
      <UserAvatar
        profileHref={profileHref}
        avatarUrl={post.author?.avatarUrl}
        displayName={displayName}
        locale={locale}
        asLink={false}
        flair={post.author?.flair}
        country={post.author?.country}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <time dateTime={post.createdAt.toISOString()}>
            {post.createdAt.toLocaleDateString(locale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
        </div>
        {post.rating && (
          <div className="mb-2">
            <RatingDisplay
              preferenceRating={post.rating.preferenceRating}
              proficiencyRating={post.rating.proficiencyRating}
            />
          </div>
        )}
        {hasContent && (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-3">
            {contentPreview}
          </p>
        )}
        <span className="text-sm text-link-primary">{tTopics('showMore')}</span>
      </UserAvatar>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="text-red-500/70">&#9829;</span>
          {post.likeMeta.likeCount > 0 && <span>{post.likeMeta.likeCount}</span>}
        </div>

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
                {t('newReply', {
                  time: formatRelativeTime(post.replyMeta.latestReplyAt, locale, t('justNow')),
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
