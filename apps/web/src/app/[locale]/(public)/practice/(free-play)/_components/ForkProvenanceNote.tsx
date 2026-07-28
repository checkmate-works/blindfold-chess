import { Link } from '@/i18n/routing';
import { FiGitBranch } from 'react-icons/fi';

import { ForkSourceLine } from './ForkSourceLine';

/** Route segment for a position kind, used to build detail links. */
const KIND_PATH_PREFIX = {
  memory: 'practice/position-memory',
  puzzle: 'practice/puzzle',
} as const;

/**
 * Two-segment provenance line shown under the position-detail title:
 * `"forked from <parent>" · "<N> forks"`. Each segment is independently
 * optional; when neither is present the slot collapses to `null` so the
 * layout falls back to the bare title.
 *
 * Extracted from the per-kind detail pages (position-memory / puzzle)
 * because the JSX is byte-identical except for the URL prefix (the
 * `forks` page and the parent's detail page both follow
 * `/practice/{kind}/...`). The kind is the only thing the two pages
 * needed to differ on.
 *
 * @design Cross-type provenance (a puzzle created from a position-memory
 * source) The parent's detail link is built from `forkParent.type`, not
 * from this page's own `pathPrefix` — a puzzle's `forkedFromId` can now
 * point at a position-memory row (see `@/lib/positions/fork`'s
 * `PUZZLE_FORK_SOURCE_TYPES`), and routing it through `pathPrefix` would
 * 404. When the parent's kind differs from the current page's kind, the
 * `crossType*` labels are used instead of `forkedFrom*` — the product
 * deliberately avoids the word "fork" for this relationship (it reads as
 * "created from a Position Memory entry", not "forked").
 */
export function ForkProvenanceNote({
  positionId,
  forkedFromId,
  forkParent,
  forkCount,
  pathPrefix,
  labels,
}: {
  positionId: string;
  forkedFromId: string | null;
  forkParent: {
    id: string;
    title: string;
    type: 'memory' | 'puzzle';
    deletedAt: Date | null;
  } | null;
  forkCount: number;
  /**
   * Route segment for this position kind, used to build the `forks`
   * listing link (always same-kind) and the parent's detail link when the
   * parent's own kind matches (the common case).
   */
  pathPrefix: 'practice/position-memory' | 'practice/puzzle';
  labels: {
    forkedFrom: string;
    forkedFromDeleted: string;
    forksSection: (count: number) => string;
    /** Used instead of `forkedFrom`/`forkedFromDeleted` when the parent is a different kind. */
    crossTypeFrom: string;
    crossTypeFromDeleted: string;
  };
}) {
  const isCrossType = forkParent !== null && KIND_PATH_PREFIX[forkParent.type] !== pathPrefix;

  const forkedFromSegment = forkedFromId ? (
    forkParent && forkParent.deletedAt === null ? (
      <ForkSourceLine
        label={isCrossType ? labels.crossTypeFrom : labels.forkedFrom}
        title={forkParent.title}
        href={`/${KIND_PATH_PREFIX[forkParent.type]}/${forkParent.id}`}
      />
    ) : (
      <ForkSourceLine
        label={isCrossType ? labels.crossTypeFromDeleted : labels.forkedFromDeleted}
      />
    )
  ) : null;

  const forksLinkSegment =
    forkCount > 0 ? (
      <Link
        href={`/${pathPrefix}/${positionId}/forks`}
        className="inline-flex items-center gap-1 underline hover:text-foreground"
      >
        <FiGitBranch className="h-3 w-3" aria-hidden />
        {labels.forksSection(forkCount)}
      </Link>
    ) : null;

  if (!forkedFromSegment && !forksLinkSegment) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2">
      {forkedFromSegment}
      {forkedFromSegment && forksLinkSegment && <span aria-hidden>·</span>}
      {forksLinkSegment}
    </span>
  );
}
