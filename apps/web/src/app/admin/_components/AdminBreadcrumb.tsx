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
 * The admin breadcrumb trail (a `<nav><ol>` of "/"-separated crumbs). Used
 * standalone on full-height editor pages (where {@link AdminPageHeader}'s big
 * h1 would clash with the editor's own title input), and internally by
 * AdminPageHeader. Pure presentational (no hooks) — safe in Server Components.
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
