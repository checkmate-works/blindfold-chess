import type { SortMode } from './shared';

/** Default page size for topic and profile listing pages. */
export const TOPIC_PAGE_SIZE = 5;

/**
 * Batch size for incrementally loaded comment trees (chunks / puzzle /
 * position-memory / repertoire pages). Counts TOP-LEVEL comments only —
 * each root always arrives with its full reply tree, so the rendered
 * comment count per batch is ≥ this number.
 */
export const COMMENT_TREE_PAGE_SIZE = 20;

const VALID_SORTS: SortMode[] = ['new', 'popular', 'active'];

/**
 * Validate and normalize a sort parameter.
 */
export function validateSort(sort: string): SortMode {
  return VALID_SORTS.includes(sort as SortMode) ? (sort as SortMode) : 'new';
}

/**
 * Build a href for a pagination link with optional sort parameter.
 */
export function buildPaginationHref(
  locale: string,
  basePath: string,
  page: number,
  sortBy: SortMode
): string {
  const params = new URLSearchParams();
  if (sortBy !== 'new') params.set('sort', sortBy);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/${locale}${basePath}${qs ? `?${qs}` : ''}`;
}
