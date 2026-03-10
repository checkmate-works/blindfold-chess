import Link from 'next/link';

type PaginationNavProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function PaginationNav({ currentPage, totalPages, buildHref }: PaginationNavProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between mt-4">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} / {totalPages}
      </div>
      <div className="flex gap-2">
        {currentPage > 1 ? (
          <Link
            href={buildHref(currentPage - 1)}
            className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
          >
            Previous
          </Link>
        ) : (
          <span className="px-4 py-2 text-sm rounded border border-border opacity-50 cursor-not-allowed">
            Previous
          </span>
        )}
        {currentPage < totalPages ? (
          <Link
            href={buildHref(currentPage + 1)}
            className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
          >
            Next
          </Link>
        ) : (
          <span className="px-4 py-2 text-sm rounded border border-border opacity-50 cursor-not-allowed">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
