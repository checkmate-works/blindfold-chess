import Image from 'next/image';
import Link from 'next/link';

import type { TopicPostWithAuthor } from '../../_lib/queries';

type Props = {
  post: TopicPostWithAuthor;
  locale: string;
  square: string;
};

export function PostCard({ post, locale, square }: Props) {
  const displayName = post.author?.displayName || post.author?.username || 'Anonymous';
  const contentPreview =
    post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content;

  return (
    <Link
      href={`/${locale}/topics/squares/${square}/posts/${post.id}`}
      className="block p-4 rounded-md border border-border bg-card hover:border-foreground/20 transition-colors"
    >
      <div className="flex items-start gap-3">
        {post.author?.avatarUrl ? (
          <Image
            src={post.author.avatarUrl}
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="font-medium text-foreground">{displayName}</span>
            <span>·</span>
            <time dateTime={post.createdAt.toISOString()}>
              {post.createdAt.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {contentPreview}
          </p>
        </div>
      </div>
    </Link>
  );
}
