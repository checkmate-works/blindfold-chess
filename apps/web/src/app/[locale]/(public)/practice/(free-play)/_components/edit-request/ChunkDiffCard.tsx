import { Link } from '@/i18n/routing';

import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import type { Locale } from '@/app/[locale]/_lib/types';

/** A chunk surfaced in the added / removed diff lists. */
export type ChunkDiffEntry = {
  id: string;
  /** `null` only for a chunk that was hard-deleted since the proposal. */
  slug: string | null;
  label: string;
  representativeFen: string | null;
  description: string | null;
};

type Props = {
  entry: ChunkDiffEntry;
  tone: 'added' | 'removed';
  badgeLabel: string;
  locale: Locale;
};

/**
 * Chunk preview card for the edit-request diff. Mirrors the
 * `RelatedTagCard` used by `RelatedTags` on the position detail page
 * (themed board thumbnail + CHUNK badge + title + description) so chunks
 * look the same everywhere they appear in the position context. A
 * left-border accent (green / red) conveys whether the proposal adds or
 * removes the chunk without departing from the shared card shape.
 */
export function ChunkDiffCard({ entry, tone, badgeLabel, locale }: Props) {
  const accent =
    tone === 'added'
      ? 'border-l-4 border-l-emerald-400 dark:border-l-emerald-500'
      : 'border-l-4 border-l-rose-400 dark:border-l-rose-500';

  const inner = (
    <>
      {entry.representativeFen ? (
        <ThemedBoardThumbnail fen={entry.representativeFen} className="w-16 h-16 shrink-0" />
      ) : (
        <span
          aria-hidden
          className="w-16 h-16 shrink-0 rounded-sm border border-dashed border-border"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] uppercase tracking-wider rounded px-1 bg-secondary text-secondary-foreground">
            {badgeLabel}
          </span>
          <p className="text-sm font-medium truncate">{entry.label}</p>
        </div>
        {entry.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.description}</p>
        )}
      </div>
    </>
  );

  const className = `flex items-start gap-3 p-3 rounded border border-border ${accent}`;

  // Link to the chunk page when the slug is known; a hard-deleted chunk
  // (no slug) renders as a non-interactive card.
  return entry.slug ? (
    <Link
      href={`/chunks/${entry.slug}` as '/chunks/[slug]'}
      locale={locale}
      className={`${className} hover:bg-muted transition-colors`}
    >
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}
