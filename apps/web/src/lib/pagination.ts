/**
 * Shared pagination utilities used across both public and admin pages.
 *
 * Three flavors are provided. They differ only in how an out-of-range page
 * number is treated, and that difference is deliberate — pick by whether the
 * caller renders the requested page or the nearest existing one:
 *
 * 1. `paginateItems` — for in-memory arrays (re-exported from @blindfold-chess/features).
 * 2. `getPaginationParams` — for DB-level pagination (returns limit/offset for a
 *    query). Clamps the LOWER bound only: `?page=999` on a 3-page list keeps
 *    page 999 and returns an empty result set. Admin list pages rely on this so
 *    a stale deep link visibly lands on nothing rather than silently showing
 *    different rows.
 * 3. `resolvePagination` — same limit/offset job, but clamps BOTH bounds:
 *    `?page=999` on a 3-page list renders page 3. Member-facing archives and
 *    history lists use this so a bookmark that outlived its rows still shows
 *    content. `clampPage` is the same rule on its own, for callers that already
 *    got `totalPages` back from a query helper.
 */

export { paginateItems } from '@blindfold-chess/features/utils';

/** Default page size for paginated queries. */
export const DEFAULT_PAGE_SIZE = 20;

/** Result of computing pagination parameters for a DB query. */
export type PaginationParams = {
  currentPage: number;
  totalPages: number;
  limit: number;
  offset: number;
};

/**
 * Compute limit/offset pagination parameters from a known total count.
 *
 * Clamps `requestedPage` to >= 1.
 */
export function getPaginationParams(
  requestedPage: number,
  totalCount: number,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginationParams {
  const currentPage = Math.max(1, requestedPage);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const limit = pageSize;
  const offset = (currentPage - 1) * pageSize;

  return { currentPage, totalPages, limit, offset };
}

/**
 * Clamp a requested page number into `[1, totalPages]`.
 *
 * `totalPages === 0` (an empty list) collapses to page 1 rather than 0, so the
 * empty state renders as "page 1 of 0 results" instead of a nonexistent page.
 */
export function clampPage(requestedPage: number, totalPages: number): number {
  return Math.max(1, Math.min(requestedPage, totalPages || 1));
}

/**
 * The 1-based row range the current page is showing, for a "Showing 21–40 of
 * 137" line. `shownCount` is the number of rows actually rendered, so the last
 * page reports its real end rather than a full page's worth.
 *
 * Six list pages computed this inline, each spelling `(currentPage - 1) *
 * pageSize + 1` out again; two of them are admin pages sitting next to a
 * component that had already been given the same job.
 */
export function getPageRange(
  currentPage: number,
  pageSize: number,
  shownCount: number
): { from: number; to: number } {
  const from = (currentPage - 1) * pageSize + 1;
  return { from, to: from + shownCount - 1 };
}

/** Result of resolving a requested page against a known total count. */
export type ResolvedPagination = {
  currentPage: number;
  /** Ceiling of `totalCount / pageSize`; `0` for an empty list. */
  totalPages: number;
  offset: number;
};

/**
 * Resolve a requested page against a known total count, clamping to the
 * nearest existing page.
 *
 * Unlike `getPaginationParams`, `totalPages` is NOT floored at 1 — an empty
 * list reports 0 pages so `PaginationNav` can hide itself — while
 * `currentPage` still lands on 1 via `clampPage`.
 */
export function resolvePagination(
  requestedPage: number,
  totalCount: number,
  pageSize: number
): ResolvedPagination {
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = clampPage(requestedPage, totalPages);

  return { currentPage, totalPages, offset: (currentPage - 1) * pageSize };
}

/**
 * Build the `buildHref` callback a `PaginationNav` needs: any filters currently
 * applied, then the page number, with empty filters omitted.
 *
 * Page 1 is spelled as the bare path — no `?page=1`. The first page of a list
 * is reachable by two URLs otherwise, which splits its inbound links and makes
 * the canonical tag do work the href could have avoided.
 *
 * `page` is written last so the query string matches the URLs already in the
 * wild: every list that carries a filter put the filter first. Changing that
 * order would rewrite indexed URLs and their CDN cache keys for no gain.
 *
 * Callers whose filter set includes a sort mode should go through
 * `buildPaginationHref`, which adds the rule that the default sort is elided.
 *
 * Not to be confused with `buildAdminListHref`, which always writes `page`:
 * admin lists are noindex and their operators paste URLs at each other, where
 * an explicit page number reads better than an implied one.
 */
export function buildPageHref(
  basePath: string,
  filters: Record<string, string | null | undefined> = {}
): (page: number) => string {
  return (page) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
}
