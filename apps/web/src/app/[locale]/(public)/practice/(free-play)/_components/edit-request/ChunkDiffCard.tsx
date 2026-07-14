import { Link } from '@/i18n/routing';

import { TagCardContent } from '@/app/[locale]/_components/TagCardContent';
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
 * Chunk preview card for the edit-request diff. Renders the shared
 * `TagCardContent` (same inner markup as `RelatedTagCard` on the position
 * detail page) so chunks look the same everywhere they appear in the
 * position context — including the "No Image" fallback for a hard-deleted
 * chunk whose FEN is gone. A left-border accent (green / red) conveys
 * whether the proposal adds or removes the chunk without departing from the
 * shared card shape.
 */
export function ChunkDiffCard({ entry, tone, badgeLabel, locale }: Props) {
  const accent =
    tone === 'added'
      ? 'border-l-4 border-l-emerald-400 dark:border-l-emerald-500'
      : 'border-l-4 border-l-rose-400 dark:border-l-rose-500';

  const inner = (
    <TagCardContent
      kind="chunk"
      previewFen={entry.representativeFen}
      label={entry.label}
      description={entry.description}
      badgeText={badgeLabel}
    />
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
