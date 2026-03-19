import type { SortMode } from './queries';

const VALID_SORTS: SortMode[] = ['new', 'popular', 'active'];

/**
 * Validate and normalize a sort parameter.
 */
export function validateSort(sort: string): SortMode {
  return VALID_SORTS.includes(sort as SortMode) ? (sort as SortMode) : 'new';
}

/**
 * Calculate pagination values from total count, page size, and requested page.
 */
export function paginate<T>(items: T[], pageSize: number, requestedPage: number) {
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = Math.max(1, Math.min(requestedPage, totalPages || 1));
  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return { totalCount, totalPages, currentPage, paginatedItems };
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
