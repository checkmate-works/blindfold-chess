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
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors text-2xl">
      {icon}
    </div>
  );

  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group gap-1"
    >
      {overlay ? (
        <div className="relative">
          {iconContainer}
          {overlay}
        </div>
      ) : (
        iconContainer
      )}
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
        {label}
      </span>
    </Link>
  );
}
