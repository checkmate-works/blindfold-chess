import { memo } from 'react';
import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';

type Props = {
  /**
   * Target URL. Pass `null` to render the card as a non-interactive `<div>`
   * (used when a feed entity has no detail page yet — e.g. `sequence`
   * positions). The card still shows the thumbnail and children so the
   * content remains visible in the feed.
   */
  href: string | null;
  locale?: string;
  external?: boolean;
  thumbnail: ReactNode;
  thumbnailClassName?: string;
  variant?: 'feed' | 'card';
  children: ReactNode;
};

export const FeedItemCard = memo(function FeedItemCard({
  href,
  locale,
  external,
  thumbnail,
  thumbnailClassName,
  variant = 'feed',
  children,
}: Props) {
  const baseClassName =
    variant === 'card'
      ? 'flex gap-4 p-4 rounded-md border border-border bg-card hover:border-foreground/20 transition-colors'
      : 'flex gap-4 p-4 hover:bg-muted/50 transition-colors';

  const content = (
    <>
      <div className={`w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 ${thumbnailClassName ?? ''}`.trim()}>
        {thumbnail}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">{children}</div>
    </>
  );

  if (href === null) {
    // Non-link: drop hover affordances since nothing is clickable.
    const staticClassName =
      variant === 'card'
        ? 'flex gap-4 p-4 rounded-md border border-border bg-card'
        : 'flex gap-4 p-4';
    return <div className={staticClassName}>{content}</div>;
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored" className={baseClassName}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} locale={locale} className={baseClassName}>
      {content}
    </Link>
  );
});
