'use client';

import { Link } from '@/i18n/routing';

import { TagCardContent } from '@/app/[locale]/_components/TagCardContent';
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
 * The chunk-reference card: the shared `TagCardContent` (themed mini-board +
 * badge + title + description, same inner markup as the puzzle / position
 * "Useful patterns" `RelatedTagCard`) in a horizontal card linking to the
 * chunk page. Shared by the staged-preview card (`StagedChunkCard`) and the
 * comment-styled linked-chunk row (`ChunkLinkCard`) — reused as-is by both
 * the shared-game and repertoire chunk-linking features, since it has no
 * dependency on either parent.
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
      <TagCardContent
        kind="chunk"
        previewFen={representativeFen}
        label={title}
        description={description}
        badgeText={badge}
        bodyClassName={reserveRemoveSpace ? 'pr-7' : ''}
      />
    </Link>
  );
}
