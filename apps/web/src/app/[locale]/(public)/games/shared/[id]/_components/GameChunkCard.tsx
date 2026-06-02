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
  /** Render the corner × only when removal is permitted (owner / suggester / staged). */
  onRemove?: () => void;
  removeLabel?: string;
};

/**
 * A linked chunk on a game move, rendered with the same card as the puzzle /
 * position "Useful patterns" section (`RelatedTagCard`): a themed mini-board +
 * badge + title + description in a horizontal card linking to the chunk page.
 * The × (shown only when `onRemove` is provided) is a sibling of the link so it
 * is not a button nested in an anchor.
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
      <Link
        href={`/chunks/${slug}` as '/chunks/[slug]'}
        locale={locale}
        className="flex items-start gap-3 rounded border border-border p-3 transition-colors hover:bg-muted"
      >
        <ThemedBoardThumbnail fen={representativeFen} className="h-16 w-16 shrink-0" />
        <div className={`min-w-0 flex-1 ${onRemove ? 'pr-7' : ''}`}>
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
