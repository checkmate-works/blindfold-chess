import Link from 'next/link';

/**
 * One breadcrumb entry. Entries with `href` render as links (ancestors); the
 * entry without `href` is the current page (rendered as plain foreground text).
 */
export type AdminCrumb = { label: string; href?: string };

type AdminBreadcrumbProps = {
  items: AdminCrumb[];
  className?: string;
};

/**
 * The admin breadcrumb trail (a `<nav><ol>` of "/"-separated crumbs). Normally
 * reached through {@link AdminPageLayout}, which renders it at the foot of the
 * page. The full-height editor pages compose it directly instead, at the top:
 * they have no h1 of their own (the editor owns the title input) and their body
 * is locked to the viewport height, so a trail below it would only be reachable
 * by scrolling. Pure presentational (no hooks) — safe in Server Components.
 */
export function AdminBreadcrumb({ items, className }: AdminBreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
        {items.map((crumb, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && <span className="mx-1">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
