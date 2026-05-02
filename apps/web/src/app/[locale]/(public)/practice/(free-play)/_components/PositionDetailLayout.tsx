import type { ReactNode } from 'react';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';

type Props = {
  /** Page title shown above the panel. */
  title: string;
  /**
   * Main detail content (description, board, related chunks, author,
   * comments, etc.). Wrapped in a `space-y-6` flow inside the page panel.
   */
  children: ReactNode;
  /**
   * Pre-built breadcrumb slot rendered at the bottom of the panel.
   * Leaving this as a slot rather than reconstructing it inside the layout
   * keeps the i18n namespaces (and the `Breadcrumb` import path) at the
   * call site, where every detail page already resolves its own labels.
   */
  breadcrumb: ReactNode;
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
 * Captures the outer markup that was duplicated between the two pages:
 *   <div className="space-y-8">
 *     <PageTitle>{title}</PageTitle>
 *     <PagePanel>
 *       <div className="space-y-6">{children}</div>
 *       {bottomAdSense}
 *       <Divider />
 *       {breadcrumb}
 *     </PagePanel>
 *   </div>
 *
 * The variable parts (board renderer, action buttons, comment-tree
 * configuration, author attribution, i18n namespaces) stay at the call
 * site where each detail page resolves its own translations. This avoids
 * pushing a wide prop surface onto the layout while still removing the
 * shell-level duplication.
 */
export function PositionDetailLayout({ title, children, breadcrumb, bottomAdSense }: Props) {
  return (
    <div className="space-y-8">
      <PageTitle>{title}</PageTitle>

      <PagePanel>
        <div className="space-y-6">{children}</div>

        {bottomAdSense}

        <Divider />

        {breadcrumb}
      </PagePanel>
    </div>
  );
}
