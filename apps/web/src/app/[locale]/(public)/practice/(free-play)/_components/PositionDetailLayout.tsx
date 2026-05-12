import type { ReactNode } from 'react';

import { PageLayout } from '@/app/[locale]/_components';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  /** Page title shown above the panel. */
  title: string;
  locale: Locale;
  /**
   * Main detail content (description, board, related chunks, author,
   * comments, etc.). Wrapped in a `space-y-6` flow inside the page panel.
   */
  children: ReactNode;
  /** Breadcrumb items rendered at the bottom of the panel. */
  breadcrumbItems: BreadcrumbItem[];
  /**
   * Optional sub-line shown directly under the H1 (above the panel). Used
   * for GitHub-style "forked from …" provenance notes that should sit with
   * the heading rather than be buried in the content area.
   */
  headerNote?: ReactNode;
  /**
   * Optional bottom AdSense slot. Rendered between the content area and
   * the divider. The puzzle detail page lives under a `(no-ads)` route
   * group, so it omits this slot entirely.
   */
  bottomAdSense?: ReactNode;
};

/**
 * Shared page-shell for free-play position detail screens
 * (`position-memory/[id]` and `puzzle/[id]`).
 *
 * Wraps `PageLayout` with a `space-y-6`-flowed inner content area. The variable
 * parts (board renderer, action buttons, comment-tree configuration, author
 * attribution, i18n namespaces) stay at the call site where each detail page
 * resolves its own translations. This avoids pushing a wide prop surface onto
 * the layout while still removing the shell-level duplication.
 */
export function PositionDetailLayout({
  title,
  locale,
  children,
  breadcrumbItems,
  headerNote,
  bottomAdSense,
}: Props) {
  return (
    <PageLayout title={title} locale={locale} breadcrumb={breadcrumbItems} headerNote={headerNote}>
      <div className="space-y-6">{children}</div>
      {bottomAdSense}
    </PageLayout>
  );
}
