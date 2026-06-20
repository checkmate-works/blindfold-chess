/** Visual style of a tab row, shared by link-based and button-based tabs. */
export type TabsVariant = 'segmented' | 'underline';

/**
 * Classes for the tab row container (the `<nav>` / wrapper around the tabs).
 *
 * - `segmented`: a `bg-secondary` track with rounded corners and padding so the
 *   active pill sits raised inside it.
 * - `underline`: a single bottom border under the whole row; individual tabs
 *   draw their own thicker underline when active.
 */
export const tabsRowClass: Record<TabsVariant, string> = {
  segmented: 'flex rounded-lg bg-secondary p-1',
  underline: 'flex border-b border-border',
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
    return `px-4 py-2 text-sm font-bold transition-colors ${
      isActive
        ? 'border-b-2 border-primary text-primary'
        : 'text-muted-foreground hover:text-foreground'
    }`;
  }
  return `flex-1 truncate rounded-md px-2 py-2 text-center text-sm font-medium transition-colors md:px-4 ${
    isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
  }`;
}
