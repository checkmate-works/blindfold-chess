import type { ReactNode } from 'react';

import Link from 'next/link';

type Props = {
  href: string;
  label: string;
  icon: ReactNode;
  /**
   * Optional node rendered absolutely on top of the icon container
   * (e.g. a badge). Rendered inside a `relative` wrapper so callers can
   * freely position overlays with `absolute` classes.
   */
  overlay?: ReactNode;
};

/**
 * Small square shortcut card with an icon above a label.
 * Used on the landing dashboard and home page quick actions.
 */
export function IconShortcutCard({ href, label, icon, overlay }: Props) {
  const iconContainer = (
    <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors text-2xl">
      {icon}
    </div>
  );

  return (
    <Link
      href={href}
      className="flex flex-col items-center w-24 h-24 pt-3 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all group gap-1"
    >
      {overlay ? (
        <div className="relative">
          {iconContainer}
          {overlay}
        </div>
      ) : (
        iconContainer
      )}
      {/* The icon is anchored by pt-3 instead of centering the whole column,
          so cards whose label wraps to two lines keep their icon at the same
          height as one-line neighbors; the label centers in the leftover strip. */}
      <span className="flex-1 flex items-center justify-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
        {label}
      </span>
    </Link>
  );
}
