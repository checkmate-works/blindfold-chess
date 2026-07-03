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
  const start = (currentPage - 1) * pageSize + 1;
  return (
    <p className="text-sm text-muted-foreground mb-2">
      Showing {start}&ndash;{start + shownCount - 1} of {totalCount} {itemLabel}
    </p>
  );
}
