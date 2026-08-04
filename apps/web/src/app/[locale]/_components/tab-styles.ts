/** Visual style of a tab row, shared by link-based and button-based tabs. */
export type TabsVariant = 'segmented' | 'underline';

/**
 * Classes for the tab row container (the `<nav>` / wrapper around the tabs).
 *
 * - `segmented`: a `bg-secondary` track with rounded corners and padding so the
 *   active pill sits raised inside it.
 * - `underline`: a single bottom border under the whole row; individual tabs
 *   draw their own thicker underline when active. `w-max min-w-full` lets the
 *   row grow past its container so {@link tabsScrollClass} can scroll it —
 *   see there for why.
 */
export const tabsRowClass: Record<TabsVariant, string> = {
  segmented: 'flex rounded-lg bg-secondary p-1',
  underline: 'flex w-max min-w-full border-b border-border',
};

/**
 * Classes for the element wrapping an `underline` row, which must be a real
 * element around {@link tabsRowClass} rather than merged into it.
 *
 * Underline tabs sit at their natural width and never truncate, so a row that
 * outgrows the viewport — four profile tabs with counts, in English, on a
 * 360px phone — used to push the whole page into a horizontal scroll. Scrolling
 * the row instead keeps the page still.
 *
 * Two elements, because the bottom rule has to live on the inner row: the tabs
 * carry `-mb-px` to overlap it, and a 1px overhang past a scroll container's
 * content box makes the container vertically scrollable and clips the active
 * tab's underline. On the inner row the overhang lands exactly on the border it
 * is meant to cover, so nothing overflows and nothing is clipped.
 *
 * Empty for `segmented`: those tabs are `flex-1` and truncate to fit, so the
 * row cannot outgrow its container in the first place.
 */
export const tabsScrollClass: Record<TabsVariant, string> = {
  segmented: '',
  underline: 'overflow-x-auto',
};

/**
 * Classes for a single tab (an `<a>`/`<Link>` or a `<button>`).
 *
 * - `segmented`: pill that stretches to fill the row (`flex-1`); the active tab
 *   gets a raised `bg-card` surface.
 * - `underline`: minimal text tab at its natural width, left-aligned; the
 *   active tab is tinted with the brand `primary` accent (text + a thick bottom
 *   border) so "selected" reads as the same blue used by links and the focus
 *   ring, rather than a flat black rule. Matches the public profile tabs.
 */
export function tabItemClass(variant: TabsVariant, isActive: boolean): string {
  if (variant === 'underline') {
    // `-mb-px` pulls each tab down by 1px so the active tab's 2px bottom border
    // sits directly over the row's own `border-b` (see `tabsRowClass.underline`)
    // instead of stacking above it — otherwise the row's grey rule peeks out
    // beneath the highlighted blue line as a faint double border. Applied to
    // every tab (not just the active one) so tabs stay vertically aligned.
    //
    // `shrink-0` keeps each tab at its natural width inside the scrolling row:
    // without it flexbox compresses the tabs to fit and the labels wrap to two
    // lines instead of the row scrolling.
    return `-mb-px shrink-0 whitespace-nowrap px-4 py-2 text-sm font-bold transition-colors ${
      isActive
        ? 'border-b-2 border-primary text-primary'
        : 'text-muted-foreground hover:text-foreground'
    }`;
  }
  return `flex-1 truncate rounded-md px-2 py-2 text-center text-sm font-medium transition-colors md:px-4 ${
    isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
  }`;
}
