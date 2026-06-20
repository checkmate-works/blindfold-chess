'use client';

import { Link } from '@/i18n/routing';

import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  slug: string;
  title: string;
  description: string | null;
  representativeFen: string;
  badge: string;
  locale: Locale;
  /** Reserve right padding for an overlapping corner control (the staged card's ×). */
  reserveRemoveSpace?: boolean;
};

/**
 * The chunk-reference card: a themed mini-board + badge + title + description in
 * a horizontal card linking to the chunk page (mirrors the puzzle / position
 * "Useful patterns" `RelatedTagCard`). Shared by the staged-preview card
 * (`GameChunkCard`) and the comment-styled linked-chunk row (`GameChunkLinkCard`).
 */
export function ChunkRefLink({
  slug,
  title,
  description,
  representativeFen,
  badge,
  locale,
  reserveRemoveSpace = false,
}: Props) {
  return (
    <Link
      href={`/chunks/${slug}` as '/chunks/[slug]'}
      locale={locale}
      className="flex items-start gap-3 rounded border border-border p-3 transition-colors hover:bg-muted"
    >
      <ThemedBoardThumbnail fen={representativeFen} className="h-16 w-16 shrink-0" />
      <div className={`min-w-0 flex-1 ${reserveRemoveSpace ? 'pr-7' : ''}`}>
        <div className="mb-0.5 flex items-center gap-2">
          <span className="rounded bg-secondary px-1 text-[10px] uppercase tracking-wider text-secondary-foreground">
            {badge}
          </span>
          <p className="truncate text-sm font-medium">{title}</p>
        </div>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </Link>
  );
}
