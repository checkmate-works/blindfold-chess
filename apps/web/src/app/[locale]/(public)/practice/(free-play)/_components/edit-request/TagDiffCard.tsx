import { Link } from '@/i18n/routing';

import { buildGlossaryUrlForSlug } from '@/lib/themes/url';

import { TagCardContent } from '@/app/[locale]/_components/TagCardContent';
import type { Locale } from '@/app/[locale]/_lib/types';

/** A theme or chunk surfaced in an edit request's "will add" list. */
export type TagDiffEntry = {
  kind: 'theme' | 'chunk';
  id: string;
  /** `null` for a tag that is no longer resolvable — a hard-deleted chunk,
   * or a glossary term that has since lost its `is_theme` flag. */
  slug: string | null;
  label: string;
  previewFen: string | null;
  description: string | null;
};

type Props = {
  entry: TagDiffEntry;
  badgeLabel: string;
  locale: Locale;
};

/**
 * Tag preview card for an edit request's added-tags list. Renders the
 * shared `TagCardContent` (same inner markup as `RelatedTagCard` on the
 * position detail page) so themes and chunks look the same everywhere they
 * appear in the position context — including the "No Image" fallback for an
 * abstract theme or a hard-deleted chunk with no FEN. A green left-border
 * accent marks it as an addition without departing from the shared card
 * shape; proposals are additive, so there is no "removed" counterpart.
 */
export function TagDiffCard({ entry, badgeLabel, locale }: Props) {
  const inner = (
    <TagCardContent
      kind={entry.kind}
      previewFen={entry.previewFen}
      label={entry.label}
      description={entry.description}
      badgeText={badgeLabel}
    />
  );

  const className =
    'flex items-start gap-3 p-3 rounded border border-border border-l-4 border-l-emerald-400 dark:border-l-emerald-500';

  // Themes link into the glossary, chunks to their own page. An unresolvable
  // tag (no slug) renders as a non-interactive card.
  if (!entry.slug) {
    return <div className={className}>{inner}</div>;
  }

  const href =
    entry.kind === 'theme'
      ? (buildGlossaryUrlForSlug(entry.slug) as '/glossary')
      : (`/chunks/${entry.slug}` as '/chunks/[slug]');

  return (
    <Link href={href} locale={locale} className={`${className} hover:bg-muted transition-colors`}>
      {inner}
    </Link>
  );
}
