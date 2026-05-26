import { Link } from '@/i18n/routing';
import { FiGitBranch } from 'react-icons/fi';

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
  forkParent: { id: string; title: string; deletedAt: Date | null } | null;
  forkCount: number;
  /**
   * Route segment for this position kind, used to build the parent's
   * detail link and the `forks` listing link. Either
   * `practice/position-memory` or `practice/puzzle`.
   */
  pathPrefix: 'practice/position-memory' | 'practice/puzzle';
  labels: {
    forkedFrom: string;
    forkedFromDeleted: string;
    forksSection: (count: number) => string;
  };
}) {
  const forkedFromSegment = forkedFromId ? (
    <span className="inline-flex items-center gap-1">
      <FiGitBranch className="h-3 w-3" aria-hidden />
      {forkParent && forkParent.deletedAt === null ? (
        <>
          {labels.forkedFrom}{' '}
          <Link
            href={`/${pathPrefix}/${forkParent.id}`}
            className="underline hover:text-foreground"
          >
            {forkParent.title}
          </Link>
        </>
      ) : (
        <span>{labels.forkedFromDeleted}</span>
      )}
    </span>
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
