'use client';

import { memo } from 'react';
import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';

type Props = {
  href: string;
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
  const className =
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

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} locale={locale} className={className}>
      {content}
    </Link>
  );
});
