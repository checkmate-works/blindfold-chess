import type { ReactNode } from 'react';

import { Breadcrumb } from './Breadcrumb';
import type { BreadcrumbItem } from './Breadcrumb';
import { Divider } from './Divider';
import { PagePanel } from './PagePanel';
import { PageTitle } from './PageTitle';

type Props = {
  /** Title shown in the centered `<h1>` above the panel. */
  title: ReactNode;
  /**
   * Optional element rendered to the right of the title in a centered flex row.
   * Intended for a `HelpTourButton` or similar small affordance — keeps the
   * title visually centered as a group.
   */
  titleAction?: ReactNode;
  /**
   * Optional sub-line rendered directly below the title (and above the panel)
   * with tight `mt-1` spacing so it visually attaches to the heading rather
   * than floating in the `space-y-8` gap. Intended for GitHub-style page-level
   * provenance notes (e.g. "forked from …").
   */
  headerNote?: ReactNode;
  /** Locale used by `Breadcrumb` to prefix link `href`s and emit `BreadcrumbList` JSON-LD. */
  locale: string;
  /**
   * Breadcrumb items rendered at the bottom of the panel. Omit (or pass an empty array)
   * to skip the breadcrumb section entirely — used by pages that don't want a trail
   * (e.g. transient flows like `/redirect`).
   */
  breadcrumb?: BreadcrumbItem[];
  /** Render a `Divider` between the page content and the breadcrumb. Defaults to `true`. */
  divider?: boolean;
  /** Override the className passed to the trailing `Divider`. */
  dividerClassName?: string;
  /** Override the inner spacing class on the panel. Defaults to `space-y-8`. */
  panelClassName?: string;
  /** Override the outer container class. Defaults to `space-y-8`. */
  className?: string;
  children: ReactNode;
};

/**
 * Standard page scaffold: centered title + panel-wrapped content + bottom breadcrumb.
 *
 * Replaces the boilerplate `<div className="space-y-8"><PageTitle/><PagePanel>...children...
 * <Divider/><Breadcrumb/></PagePanel></div>` that was duplicated across ~95 pages. Centralizes
 * the spacing rules so layout-level tweaks (e.g. evening out the breadcrumb's top/bottom
 * margins) only need to be made here. Pages that need a non-standard structure (no panel,
 * breadcrumb at the top, etc.) should keep composing the primitives directly.
 */
export function PageLayout({
  title,
  titleAction,
  headerNote,
  locale,
  breadcrumb,
  divider = true,
  dividerClassName,
  panelClassName,
  className = 'space-y-8',
  children,
}: Props) {
  const hasBreadcrumb = breadcrumb && breadcrumb.length > 0;

  // Group the heading and its `headerNote` in one block so the outer
  // `space-y-8` only fires between (title-group) and (panel), not between
  // title and note. `mt-1` keeps the note visually attached to the H1.
  const heading = (
    <div>
      {titleAction ? (
        <div className="flex items-center justify-center gap-2">
          <PageTitle>{title}</PageTitle>
          {titleAction}
        </div>
      ) : (
        <PageTitle>{title}</PageTitle>
      )}
      {headerNote && (
        <div className="mt-1 text-center text-sm text-muted-foreground">{headerNote}</div>
      )}
    </div>
  );

  return (
    <div className={className}>
      {heading}
      <PagePanel className={panelClassName}>
        {children}
        {hasBreadcrumb && (
          // `!mt-4` halves the `space-y-8` gap (32px → 16px) that the panel's
          // own spacing class would otherwise apply between the last child of
          // `children` and this trailing block — the previous default left the
          // breadcrumb floating noticeably high. The inner `space-y-4` keeps
          // the divider visually grouped with the breadcrumb without re-introducing
          // the wide gap.
          <div className="!mt-4 space-y-4">
            {divider && <Divider className={dividerClassName} />}
            <Breadcrumb items={breadcrumb} locale={locale} density="compact" />
          </div>
        )}
      </PagePanel>
    </div>
  );
}
