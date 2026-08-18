import { getPageRange } from '@/lib/pagination';

type AdminListSummaryProps = {
  currentPage: number;
  pageSize: number;
  /** Number of rows on the current page. Renders nothing when 0. */
  shownCount: number;
  totalCount: number;
  /** Plural entity noun, e.g. "chunks", "positions". */
  itemLabel: string;
};

export function AdminListSummary({
  currentPage,
  pageSize,
  shownCount,
  totalCount,
  itemLabel,
}: AdminListSummaryProps) {
  if (shownCount === 0) return null;
  const { from, to } = getPageRange(currentPage, pageSize, shownCount);
  return (
    <p className="text-sm text-muted-foreground mb-2">
      Showing {from}&ndash;{to} of {totalCount} {itemLabel}
    </p>
  );
}
