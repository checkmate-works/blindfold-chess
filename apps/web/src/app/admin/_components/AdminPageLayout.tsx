import type { ReactNode } from 'react';

import { AdminBreadcrumb, type AdminCrumb } from './AdminBreadcrumb';

export type { AdminCrumb };

type AdminPageLayoutProps = {
  /**
   * The full trail, current page last (e.g. `[{label:'Articles',
   * href:'/admin/articles'}, {label: article.title, href: editHref},
   * {label:'Publish'}]`). It supplies both the default `title` and the trailing
   * breadcrumb, which is omitted when there is no ancestor (a single-item trail
   * on a top-level page) — there would be nothing to navigate up to.
   */
  breadcrumbs: AdminCrumb[];
  /** h1 text. Defaults to the last breadcrumb's label. */
  title?: ReactNode;
  /** Right-aligned action slot (buttons, links) beside the title. */
  actions?: ReactNode;
  /** Class list for the wrapper around `children` (e.g. `space-y-6`). */
  contentClassName?: string;
  children?: ReactNode;
};

/**
 * Standard page scaffold for the admin panel: title + actions on top, page
 * content, and the breadcrumb trail at the foot.
 *
 * The breadcrumb sits at the bottom to match the public pages' `PageLayout`,
 * which has always closed a page with its trail rather than opening with one.
 * Admin used to do the opposite, so moving between the two halves of the app
 * meant the same element jumping from one end of the viewport to the other.
 *
 * Pure presentational (no hooks) so it works in Server Components — each page
 * passes its own trail, resolving dynamic segment labels (article title,
 * username) server-side.
 *
 * The full-height editor pages (articles / announcements new + edit) do not use
 * this: they have no h1 of their own to render — the editor owns the title
 * input — and their body is locked to the viewport height, so a trail below it
 * would only be reachable by scrolling. Those compose {@link AdminBreadcrumb}
 * directly, at the top.
 */
export function AdminPageLayout({
  breadcrumbs,
  title,
  actions,
  contentClassName,
  children,
}: AdminPageLayoutProps) {
  const current = breadcrumbs[breadcrumbs.length - 1];
  const heading = title ?? current?.label;

  return (
    <div>
      {/* min-w-0 + break-words lets long unbreakable headings (emails, UUIDs,
          usernames) wrap instead of overflowing the narrow admin content
          column on tablet widths; shrink-0 keeps the actions intact. */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="min-w-0 break-words text-2xl font-bold">{heading}</h1>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      <div className={contentClassName}>{children}</div>

      {breadcrumbs.length > 1 && (
        <div className="mt-8 border-t border-border pt-4">
          <AdminBreadcrumb items={breadcrumbs} />
        </div>
      )}
    </div>
  );
}
