import Link from 'next/link';

type PaginationNavProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
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

const linkClass =
  'px-3 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors';
const disabledClass =
  'px-3 py-2 text-sm rounded border border-border opacity-50 cursor-not-allowed';
const pageClass =
  'px-3 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors min-w-[2.5rem] text-center';
const currentPageClass =
  'px-3 py-2 text-sm rounded border border-border bg-foreground text-background font-semibold min-w-[2.5rem] text-center';

export function PaginationNav({ currentPage, totalPages, buildHref }: PaginationNavProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 mt-4">
      {/* Previous button */}
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className={linkClass}
          aria-label="Previous page"
          data-pagination-item="link"
        >
          <span className="sm:hidden">←</span>
          <span className="hidden sm:inline">Previous</span>
        </Link>
      ) : (
        <span className={disabledClass} aria-label="Previous page" data-pagination-item="disabled">
          <span className="sm:hidden">←</span>
          <span className="hidden sm:inline">Previous</span>
        </span>
      )}

      {/* Page numbers */}
      {pageItems.map((item, index) =>
        item === null ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 py-2 text-sm text-muted-foreground"
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
          aria-label="Next page"
          data-pagination-item="link"
        >
          <span className="sm:hidden">→</span>
          <span className="hidden sm:inline">Next</span>
        </Link>
      ) : (
        <span className={disabledClass} aria-label="Next page" data-pagination-item="disabled">
          <span className="sm:hidden">→</span>
          <span className="hidden sm:inline">Next</span>
        </span>
      )}
    </nav>
  );
}
