import type { ReactNode } from 'react';

// Plain `next/link` (not the i18n routing Link) with a locale-prefixed href,
// so this stays SSR-safe when used inside server components (avoids
// DYNAMIC_SERVER_USAGE). Callers pass the full `/${locale}/...` href.
import Link from 'next/link';

type Props = {
  /** Full, locale-prefixed href (e.g. `/en/glossary/category/tactics`). */
  href: string;
  /** Icon node, pre-sized by the caller to sit inside the 40px badge. */
  icon: ReactNode;
  title: ReactNode;
  /** Optional secondary line rendered under the title. */
  subtitle?: ReactNode;
  /** Highlight as the current item (e.g. the active glossary category). */
  active?: boolean;
  className?: string;
};

/**
 * Compact icon + title (+ subtitle) navigation tile.
 *
 * A pure presentational component — no `"use client"`, no hooks, no async — so
 * it renders on the server for SEO and can also be used inside client
 * components. Shared by the leaderboard module grid (`LeaderboardCard`) and the
 * glossary category index so those tiles stay visually identical.
 */
export function IconTileCard({
  href,
  icon,
  title,
  subtitle,
  active = false,
  className = '',
}: Props) {
  const stateClasses = active
    ? 'border-foreground/20 bg-muted'
    : 'border-border bg-card hover:border-foreground/20';

  return (
    <Link
      href={href}
      className={`group block rounded-lg border p-4 transition-all ${stateClasses} ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-border bg-muted">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {subtitle}
        </div>
      </div>
    </Link>
  );
}
