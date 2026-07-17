import { type PaginationNavLabels, PaginationNavView } from '@/app/[locale]/_components';

type AdminPaginationNavProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

// The admin area sits outside `[locale]` and is English-only by convention
// (`<html lang="en">`), so the labels are fixed English strings rather than
// `Common.pagination` translations.
const ADMIN_LABELS: PaginationNavLabels = {
  navLabel: 'Pagination',
  previous: 'Previous',
  next: 'Next',
  previousPage: 'Previous page',
  nextPage: 'Next page',
};

/**
 * Admin-only wrapper around the shared PaginationNavView.
 *
 * Why this exists
 * ---------------
 * The shared pagination bar is used on public-facing pages where the surrounding
 * background already provides enough contrast that transparent page items look
 * fine. In the admin area the surrounding `<main>` uses `bg-background`, so the
 * transparent pager items visually blend in. This wrapper paints an opaque
 * `bg-card` surface on the interactive pager items — without touching the
 * shared component's rendering.
 *
 * How the selector works
 * ----------------------
 * The shared PaginationNavView tags each rendered cell with a stable
 * `data-pagination-item` attribute:
 *
 *   - `link`     — clickable Link (prev, next, page number)
 *   - `disabled` — disabled prev/next span (on first/last page)
 *   - `current`  — current page span (already has `bg-foreground`)
 *   - `ellipsis` — ellipsis span (should stay transparent)
 *
 * We paint `bg-card` on `link` and `disabled` only. The current page and
 * ellipsis are left alone, preserving their existing look.
 *
 * Hover
 * -----
 * The wrapper re-asserts hover explicitly via `[&_[data-pagination-item=link]:hover]:bg-secondary`
 * so we don't depend on cascade/source order: the `bg-card` and `bg-secondary`
 * rules generated here have equal specificity, but the `:hover` one only
 * matches on interaction, making the resting/hover states deterministic.
 */
export function AdminPaginationNav({
  currentPage,
  totalPages,
  buildHref,
}: AdminPaginationNavProps) {
  return (
    <div className="[&_[data-pagination-item=link]]:bg-card [&_[data-pagination-item=disabled]]:bg-card [&_[data-pagination-item=link]:hover]:bg-secondary">
      <PaginationNavView
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={buildHref}
        labels={ADMIN_LABELS}
      />
    </div>
  );
}
