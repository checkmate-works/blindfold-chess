import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';

export type LinkTabItem = {
  /** Stable identifier compared against `activeValue` to mark the active tab. */
  value: string;
  /** Visible label (string or node, e.g. an emoji + text). */
  label: ReactNode;
  /** Locale-relative destination (e.g. `/topics/squares`); locale is prepended by `Link`. */
  href: string;
};

type Props = {
  items: LinkTabItem[];
  /** `value` of the currently active tab. The active tab is highlighted. */
  activeValue: string;
  locale?: string;
  /** Accessible label for the tablist (e.g. the section/page title). */
  'aria-label'?: string;
  className?: string;
};

/**
 * Link-based segmented tabs — a row of pill tabs where each tab navigates to a
 * different route (vs. an in-place state switch). The active tab is rendered
 * highlighted; the others link away. Reuses the segmented-control styling used
 * across the app (leaderboard tabs, practice SegmentedControl): a
 * `bg-secondary` track with a raised `bg-card` active pill.
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
}: Props) {
  return (
    <nav
      className={`flex rounded-lg bg-secondary p-1 ${className ?? ''}`.trim()}
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
            role="tab"
            aria-selected={isActive}
            className={`flex-1 truncate rounded-md px-2 py-2 text-center text-sm font-medium transition-colors md:px-4 ${
              isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
