import { countContentRevisionsForPosition } from '@/lib/positions/content-revision-queries';

import { loadPositionDetail } from './load-position-detail';

/**
 * Everything the position-memory and puzzle detail pages need beyond the row
 * itself: the detail payload plus the "(edited)" signal, fetched together.
 *
 * The two edit signals are deliberately separate. The tracked revision count
 * only rises on a genuine content change and is the only one that can link to
 * `/history`, so it takes priority. The timestamp heuristic is the fallback
 * for edits made before revision tracking shipped — it also trips on a no-op
 * save, which is why it never produces a link, but dropping it would silently
 * strip the "(edited)" marker from every pre-existing edited position.
 */
type DetailArgs = Parameters<typeof loadPositionDetail>[0];

/** The loader's row, plus the timestamps the legacy edit heuristic reads. */
type Args = Omit<DetailArgs, 'position'> & {
  position: DetailArgs['position'] & { createdAt: Date; updatedAt: Date };
};

export async function loadPositionDetailPage(args: Args) {
  const [detail, revisionCount] = await Promise.all([
    loadPositionDetail(args),
    countContentRevisionsForPosition(args.position.id),
  ]);

  const hasTrackedHistory = revisionCount > 0;
  const editedByLegacyHeuristic =
    args.position.updatedAt.getTime() - args.position.createdAt.getTime() > 1000;

  return {
    ...detail,
    /** Whether a `/history` page exists to link the "(edited)" marker at. */
    hasTrackedHistory,
    edited: hasTrackedHistory || editedByLegacyHeuristic,
  };
}
