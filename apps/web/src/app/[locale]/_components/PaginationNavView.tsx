import Link from 'next/link';

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * Display strings for {@link PaginationNavView}. Required (no English
 * defaults) so a caller can't silently ship untranslated labels — resolve
 * them from `Common.pagination` (see `PaginationNav` for the server path)
 * or pass explicit strings (see `AdminPaginationNav`).
 */
export type PaginationNavLabels = {
  /** aria-label on the <nav> landmark. */
  navLabel: string;
  /** Visible text of the previous-page control. */
  previous: string;
  /** Visible text of the next-page control. */
  next: string;
  /** aria-label on the previous-page control. */
  previousPage: string;
  /** aria-label on the next-page control. */
  nextPage: string;
};

type PaginationNavViewProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  labels: PaginationNavLabels;
};

/**
 * Build the list of page items to display in pagination.
 * Inspired by GitHub/Primer pagination truncation logic.
 *
 * - Always shows first and last page
 * - Shows `surroundingPageCount` pages around the current page
 * - Uses ellipsis (null) for gaps
 * - When totalPages <= 5, shows all pages without truncation
 */
function buildPageItems(currentPage: number, totalPages: number): (number | null)[] {
  const surroundingPageCount = 1;

  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | null)[] = [];

  // Always include first page
  items.push(1);

  const rangeStart = Math.max(2, currentPage - surroundingPageCount);
  const rangeEnd = Math.min(totalPages - 1, currentPage + surroundingPageCount);

  // Ellipsis after first page if needed
  if (rangeStart > 2) {
    items.push(null);
  }

  // Pages around current
  for (let i = rangeStart; i <= rangeEnd; i++) {
    items.push(i);
  }

  // Ellipsis before last page if needed
  if (rangeEnd < totalPages - 1) {
    items.push(null);
  }

  // Always include last page
  items.push(totalPages);

  return items;
}

// Shared box metrics so every item (Previous/Next, numbers, current, ellipsis)
// renders at the same height. A fixed `h-9` is used instead of vertical padding
// because the Previous/Next buttons collapse to an icon-only line on mobile,
// whose intrinsic height is shorter than the numbers' text line — `h-9` pins
// them all to the same height regardless of content.
const itemClass =
  'inline-flex items-center justify-center h-9 px-3 text-sm rounded border border-border transition-colors';
const linkClass = `${itemClass} gap-1 hover:bg-secondary`;
// Disabled state fades only the content (icon + label via currentColor), not
// the whole element — keeping the border at full strength so the box reads at
// the same size/crispness as the active controls next to it.
const disabledClass = `${itemClass} gap-1 text-muted-foreground/50 cursor-not-allowed`;
const pageClass = `${itemClass} min-w-[2.5rem] hover:bg-secondary`;
const currentPageClass = `${itemClass} min-w-[2.5rem] bg-foreground text-background font-semibold`;

/**
 * Presentational pagination bar. Sync and client-safe (no i18n, no server
 * APIs), so it may stay in the `_components` barrel and be rendered from
 * Client Components. Localised callers should not use this directly —
 * render `PaginationNav` (Server Components) or resolve `labels` from
 * `Common.pagination` via `useTranslations` (Client Components) instead.
 */
export function PaginationNavView({
  currentPage,
  totalPages,
  buildHref,
  labels,
}: PaginationNavViewProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <nav aria-label={labels.navLabel} className="flex items-center justify-center gap-1 mt-4">
      {/* Previous button */}
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className={linkClass}
          aria-label={labels.previousPage}
          data-pagination-item="link"
        >
          <FaChevronLeft aria-hidden="true" className="size-3" />
          <span className="hidden sm:inline">{labels.previous}</span>
        </Link>
      ) : (
        <span
          className={disabledClass}
          aria-label={labels.previousPage}
          data-pagination-item="disabled"
        >
          <FaChevronLeft aria-hidden="true" className="size-3" />
          <span className="hidden sm:inline">{labels.previous}</span>
        </span>
      )}

      {/* Page numbers */}
      {pageItems.map((item, index) =>
        item === null ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex items-center justify-center h-9 px-2 text-sm text-muted-foreground"
            data-pagination-item="ellipsis"
          >
            ...
          </span>
        ) : item === currentPage ? (
          <span
            key={item}
            aria-current="page"
            className={currentPageClass}
            data-pagination-item="current"
          >
            {item}
          </span>
        ) : (
          <Link key={item} href={buildHref(item)} className={pageClass} data-pagination-item="link">
            {item}
          </Link>
        )
      )}

      {/* Next button */}
      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className={linkClass}
          aria-label={labels.nextPage}
          data-pagination-item="link"
        >
          <span className="hidden sm:inline">{labels.next}</span>
          <FaChevronRight aria-hidden="true" className="size-3" />
        </Link>
      ) : (
        <span
          className={disabledClass}
          aria-label={labels.nextPage}
          data-pagination-item="disabled"
        >
          <span className="hidden sm:inline">{labels.next}</span>
          <FaChevronRight aria-hidden="true" className="size-3" />
        </span>
      )}
    </nav>
  );
}
