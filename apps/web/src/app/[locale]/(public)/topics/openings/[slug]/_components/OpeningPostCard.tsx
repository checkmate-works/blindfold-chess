'use client';

import { truncateContent } from '@/lib/truncate-content';

import { UserAvatar } from '@/app/[locale]/(public)/topics/squares/_components/UserAvatar';

import type { OpeningPostWithAuthor } from '../../_lib/queries';
import { RatingDisplay } from './RatingDisplay';

type Props = {
  post: OpeningPostWithAuthor;
  locale: string;
};

export function OpeningPostCard({ post, locale }: Props) {
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const profileHref = post.author?.username ? `/@/${post.author.username}` : null;
  const hasContent = post.content.length > 0;

  return (
    <div className="p-4 rounded-md border border-border bg-card">
      <UserAvatar
        profileHref={profileHref}
        avatarUrl={post.author?.avatarUrl}
        displayName={displayName}
        locale={locale}
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
            {truncateContent(post.content)}
          </p>
        )}
      </UserAvatar>
    </div>
  );
}
