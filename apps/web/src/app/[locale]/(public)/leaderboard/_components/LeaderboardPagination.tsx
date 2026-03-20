'use client';

import { useTranslations } from 'next-intl';

type Props = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

export function LeaderboardPagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: Props) {
  const t = useTranslations('leaderboard');

  if (totalPages <= 1) return null;

  // Generate visible page numbers
  const pages: (number | 'ellipsis')[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) pages.push('ellipsis');
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <nav aria-label={t('pagination.label')} className="flex items-center justify-between mt-6">
      <p className="text-sm text-muted-foreground">
        {t('pagination.total', { count: totalCount })}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t('pagination.previous')}
        >
          {t('pagination.previous')}
        </button>

        {pages.map((page, i) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm text-muted-foreground">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              aria-current={currentPage === page ? 'page' : undefined}
              className={`min-w-[36px] px-2 py-2 text-sm rounded border transition-colors ${
                currentPage === page
                  ? 'border-primary bg-primary text-primary-foreground font-medium'
                  : 'border-border hover:bg-secondary'
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t('pagination.next')}
        >
          {t('pagination.next')}
        </button>
      </div>
    </nav>
  );
}
