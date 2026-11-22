import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Scroll margin for an element that sits at the top of a PagePanel and is
 * scrolled into view with `block: 'start'` — a practice session wrapper
 * aligned by `useScrollToElement`, for one.
 *
 * Aligning such an element's own top to the viewport scrolls the panel's
 * top padding off screen, so how much room is left above the first row came
 * down to each module's own spacing, which ranges from none to 53px. With a
 * scroll margin equal to the panel's top padding, the alignment stops at the
 * panel's top edge instead, and every page lands at the same place.
 *
 * The steps repeat PagePanel's padding below (`p-4 sm:p-6 md:p-8`). They are
 * spelled out rather than derived because Tailwind only generates classes it
 * finds written in full; change the two together.
 */
export const PAGE_PANEL_SCROLL_MARGIN = 'scroll-mt-4 sm:scroll-mt-6 md:scroll-mt-8';

// `-mx-4` assumes the parent locale layout wrapper uses `px-4` at `<sm` (see `[locale]/layout.tsx`); breaks PagePanel out to flush-edge on mobile.
export function PagePanel({ children, className = 'space-y-8' }: Props) {
  return (
    <div
      className={`bg-card -mx-4 sm:mx-0 rounded-none sm:rounded-lg border-0 sm:border sm:border-border p-4 sm:p-6 md:p-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
