import type { PositionType } from './types';

/**
 * The position types that have their own pages: everything `positions.type`
 * can hold except `'sequence'`, which is stored but has no detail route.
 *
 * Six modules declared their own `'memory' | 'puzzle'` union — under three
 * different names — and each carried its own copy of the per-kind routing and
 * i18n constants below. Deriving the union from `PositionType` means adding a
 * fourth position type forces a decision here rather than silently leaving six
 * unions describing a set that no longer matches the column.
 */
export type PositionKind = Exclude<PositionType, 'sequence'>;

export type PositionKindConfig = {
  /** URL segment under `/practice`. */
  slug: 'position-memory' | 'puzzle';
  /** `next-intl` namespace holding this kind's `list.*` / `edit.*` messages. */
  namespace: string;
};

export const POSITION_KIND_CONFIG: Record<PositionKind, PositionKindConfig> = {
  memory: { slug: 'position-memory', namespace: 'practice.positionMemory' },
  puzzle: { slug: 'puzzle', namespace: 'practice.puzzle' },
};

/** The kind's list page, e.g. `/practice/puzzle`. */
export function getPositionListPath(kind: PositionKind): string {
  return `/practice/${POSITION_KIND_CONFIG[kind].slug}`;
}

/**
 * The kind's detail page. Non-null by construction, unlike
 * {@link getPositionDetailPath}, which also has to answer for `'sequence'`.
 */
export function getPositionKindDetailPath(kind: PositionKind, id: string): string {
  return `${getPositionListPath(kind)}/${id}`;
}
