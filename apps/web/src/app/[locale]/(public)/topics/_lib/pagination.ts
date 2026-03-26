import { paginateItems } from '@/lib/pagination';

import type { SortMode } from './queries';

/** Default page size for topic and profile listing pages. */
export const TOPIC_PAGE_SIZE = 5;

const VALID_SORTS: SortMode[] = ['new', 'popular', 'active'];

/**
 * Validate and normalize a sort parameter.
 */
export function validateSort(sort: string): SortMode {
  return VALID_SORTS.includes(sort as SortMode) ? (sort as SortMode) : 'new';
}

/**
 * Calculate pagination values from total count, page size, and requested page.
 *
 * @deprecated Use `paginateItems` from `@/lib/pagination` directly.
 */
export function paginate<T>(items: T[], pageSize: number, requestedPage: number) {
  return paginateItems(items, pageSize, requestedPage);
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
