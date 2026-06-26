import type { ReactNode } from 'react';

import { AdminBreadcrumb, type AdminCrumb } from './AdminBreadcrumb';

export type { AdminCrumb };

type AdminPageHeaderProps = {
  /**
   * The full trail, current page last (e.g. `[{label:'Articles',
   * href:'/admin/articles'}, {label: article.title, href: editHref},
   * {label:'Publish'}]`). The breadcrumb row is hidden when there is no
   * ancestor (a single-item trail on a top-level page) — only the title shows.
   */
  breadcrumbs: AdminCrumb[];
  /** h1 text. Defaults to the last breadcrumb's label. */
  title?: ReactNode;
  /** Right-aligned action slot (buttons, links). */
  actions?: ReactNode;
};

/**
 * Standardized header for admin pages: a breadcrumb trail for wayfinding /
 * up-navigation (replacing the previously ad-hoc "Back to X" links), plus the
 * page title and a right-aligned actions slot. Pure presentational (no hooks)
 * so it works in Server Components — each page passes its own trail, resolving
 * dynamic segment labels (article title, username) server-side.
 */
export function AdminPageHeader({ breadcrumbs, title, actions }: AdminPageHeaderProps) {
  const current = breadcrumbs[breadcrumbs.length - 1];
  const heading = title ?? current?.label;

  return (
    <div className="mb-6">
      {breadcrumbs.length > 1 && <AdminBreadcrumb items={breadcrumbs} className="mb-2" />}

      <div className="flex items-center justify-between gap-4">
        {/* min-w-0 + break-words lets long unbreakable headings (emails, UUIDs,
            usernames) wrap instead of overflowing the narrow admin content
            column on tablet widths; shrink-0 keeps the actions intact. */}
        <h1 className="min-w-0 break-words text-2xl font-bold">{heading}</h1>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
