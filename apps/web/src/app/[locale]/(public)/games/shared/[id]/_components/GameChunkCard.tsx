'use client';

import type { Locale } from '@/app/[locale]/_lib/types';

import { ChunkRefLink } from './ChunkRefLink';

type Props = {
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
  badge: string;
  locale: Locale;
  /** Render the corner × only when removal is permitted (the staged list). */
  onRemove?: () => void;
  removeLabel?: string;
};

/**
 * A chunk in the staging list (before submit): the shared chunk-reference card
 * with a corner × to drop it from the staging set. The × is a sibling of the
 * link so it is not a button nested in an anchor. Posted (linked) chunks use
 * the comment-styled `GameChunkLinkCard` instead.
 */
export function GameChunkCard({
  slug,
  title,
  description,
  representativeFen,
  badge,
  locale,
  onRemove,
  removeLabel,
}: Props) {
  return (
    <li className="relative">
      <ChunkRefLink
        slug={slug}
        title={title}
        description={description}
        representativeFen={representativeFen}
        badge={badge}
        locale={locale}
        reserveRemoveSpace={!!onRemove}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card/80 text-sm leading-none text-muted-foreground transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          ×
        </button>
      )}
    </li>
  );
}
