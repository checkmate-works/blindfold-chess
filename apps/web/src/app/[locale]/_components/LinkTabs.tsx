import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';

import { tabItemClass, tabsRowClass, tabsScrollClass } from './tab-styles';
import type { TabsVariant } from './tab-styles';

export type LinkTabItem = {
  /** Stable identifier compared against `activeValue` to mark the active tab. */
  value: string;
  /** Visible label (string or node, e.g. an emoji + text). */
  label: ReactNode;
  /** Locale-relative destination (e.g. `/topics/squares`); locale is prepended by `Link`. */
  href: string;
};

/** Visual style of the tab row. Alias of the shared {@link TabsVariant}. */
export type LinkTabsVariant = TabsVariant;

type Props = {
  items: LinkTabItem[];
  /** `value` of the currently active tab. The active tab is highlighted. */
  activeValue: string;
  locale?: string;
  /** Accessible label for the tablist (e.g. the section/page title). */
  'aria-label'?: string;
  className?: string;
  /**
   * Forwarded to each tab's `Link`. Pass `false` when the tab row sits partway
   * down the page (e.g. the chunk detail tabs) so switching tabs re-renders the
   * panel server-side without yanking the viewport back to the top — the reader
   * stays on the tab row. Defaults to Next's behavior (scroll to top).
   */
  scroll?: boolean;
  /**
   * Visual style of the tab row:
   * - `segmented` (default): pill tabs on a `bg-secondary` track with a raised
   *   `bg-card` active pill; tabs stretch to fill the row. Used by leaderboard
   *   and topic tabs.
   * - `underline`: minimal text tabs with a bottom border under the row and a
   *   thicker underline beneath the active tab; tabs sit left-aligned at their
   *   natural width. Used by the public profile and games tabs — a quieter
   *   style that blends into the surrounding page.
   */
  variant?: LinkTabsVariant;
};

/**
 * Link-based tabs — a row of tabs where each tab navigates to a different route
 * (vs. an in-place state switch). The active tab is rendered highlighted; the
 * others link away. Two visual styles are available via `variant`: a prominent
 * `segmented` pill control (default) and a quieter `underline` style used by
 * the public profile and games pages.
 *
 * Stateless and free of platform-specific APIs, so it is safe to render from
 * both Server and Client Components.
 */
export function LinkTabs({
  items,
  activeValue,
  locale,
  'aria-label': ariaLabel,
  className,
  scroll,
  variant = 'segmented',
}: Props) {
  const scrollClass = tabsScrollClass[variant];

  const row = (
    <nav
      className={`${tabsRowClass[variant]} ${scrollClass ? '' : (className ?? '')}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const isActive = item.value === activeValue;
        return (
          <Link
            key={item.value}
            href={item.href}
            locale={locale}
            scroll={scroll}
            role="tab"
            aria-selected={isActive}
            className={tabItemClass(variant, isActive)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  // The caller's `className` goes on whichever element is outermost, so
  // spacing utilities keep applying to the whole control.
  return scrollClass ? (
    <div className={`${scrollClass} ${className ?? ''}`.trim()}>{row}</div>
  ) : (
    row
  );
}
