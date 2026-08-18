import { type PositionKind, getPositionListPath } from '@/lib/positions/kind';

/**
 * Route segment for a position kind, used to build detail links. Lives here
 * rather than beside the components that render those links so it stays
 * importable from pure (non-React) code.
 */
export const POSITION_KIND_PATH_PREFIX: Record<PositionKind, string> = {
  memory: getPositionListPath('memory').slice(1),
  puzzle: getPositionListPath('puzzle').slice(1),
};

/** The two position kinds that can appear on either end of a fork lineage. */
export type ForkPositionKind = PositionKind;

/**
 * Decide how the create page states its `?from=` seed: which of the two
 * provenance labels applies, and where the source link points.
 *
 * Cross-type means the source is a different kind than the page being
 * authored — today only "create a puzzle from a position-memory entry". The
 * product deliberately avoids the word "fork" for that relationship (it reads
 * as "created from", not "forked from"), which is the same distinction the
 * detail page's `ForkProvenanceNote` draws; keeping the rule in one pure
 * function is what stops the two surfaces from disagreeing about when a fork
 * is a fork.
 *
 * The href is always built from the SOURCE's kind, never the page's — a
 * puzzle's parent can be a position-memory row, and routing that through the
 * puzzle prefix would 404.
 */
export function resolveForkProvenance({
  sourceId,
  sourceType,
  pageType,
}: {
  sourceId: string;
  sourceType: ForkPositionKind;
  pageType: ForkPositionKind;
}): { isCrossType: boolean; href: string } {
  return {
    isCrossType: sourceType !== pageType,
    href: `/${POSITION_KIND_PATH_PREFIX[sourceType]}/${sourceId}`,
  };
}
