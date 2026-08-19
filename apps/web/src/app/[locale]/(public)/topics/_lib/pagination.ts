import { buildPageHref } from '@/lib/pagination';
import { SORT_MODES, type SortMode } from '@/lib/sort';

/** Default page size for topic and profile listing pages. */
export const TOPIC_PAGE_SIZE = 5;

/**
 * Batch size for incrementally loaded comment trees (chunks / puzzle /
 * position-memory / repertoire pages). Counts TOP-LEVEL comments only —
 * each root always arrives with its full reply tree, so the rendered
 * comment count per batch is ≥ this number.
 */
export const COMMENT_TREE_PAGE_SIZE = 20;

/**
 * Validate and normalize a sort parameter, falling back to `'new'`.
 */
export function validateSort(sort: string): SortMode {
  return (SORT_MODES as readonly string[]).includes(sort) ? (sort as SortMode) : 'new';
}

/**
 * Build a href for a pagination link on a sortable list.
 *
 * Adds one rule to `buildPageHref`: `'new'` is the sort a list falls back to,
 * so it is left out of the URL. Spelling it would give the default ordering a
 * second address, which is the same duplicate-URL problem `buildPageHref`
 * avoids for page 1.
 */
export function buildPaginationHref(
  locale: string,
  basePath: string,
  page: number,
  sortBy: SortMode
): string {
  return buildPageHref(`/${locale}${basePath}`, {
    sort: sortBy === 'new' ? null : sortBy,
  })(page);
}
