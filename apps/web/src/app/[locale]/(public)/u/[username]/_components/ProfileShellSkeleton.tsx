import type { ReactNode } from 'react';

import { PageLayout } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';
import { tabItemClass, tabsRowClass, tabsScrollClass } from '@/app/[locale]/_components/tab-styles';

type Props = {
  /** The already-translated `publicProfile.pageTitle` — static per locale. */
  title: string;
  locale: string;
  /**
   * Whether to reserve room for the title's trailing affordance. The timeline
   * renders a `HelpTourButton` there; the archives pass no `titleAction`, so a
   * boundary shared with them can turn the placeholder off.
   */
  titleAction?: boolean;
  /** Skeleton for the active page's body, drawn below the tab row. */
  children: ReactNode;
};

/**
 * Loading-state twin of {@link ProfileShell} — identity header, stats band and
 * tab row as placeholders, with the page's own body skeleton beneath.
 *
 * Kept next to the real shell so the two move together: the shell is what a
 * reader recognises as "this member's page", and a boundary that draws a
 * different shape would defeat the point of showing one at all. Everything
 * here is a runtime value (name, avatar, counts, belt), so it is all bars —
 * only the page title, which is static per locale, renders as real text.
 *
 * @design Why the stats band is always drawn
 * {@link ProfileStatsBand} renders `null` for a member with neither a rank nor
 * an achievement, so this row is a small over-draw for them. Reserving it is
 * still the better trade: the band is one short row, whereas omitting it would
 * shift the tabs and the whole feed downward for every *ranked* member — the
 * common case, and the larger movement.
 */
export function ProfileShellSkeleton({ title, locale, titleAction = true, children }: Props) {
  return (
    <PageLayout
      title={title}
      locale={locale}
      titleAction={titleAction ? <Skeleton className="h-5 w-5 rounded-full" /> : undefined}
    >
      <div className="space-y-6" aria-hidden="true">
        {/* ProfileHeader: avatar (UserAvatar size="lg" = 64px) + name/handle,
            with the follow control and "⋯" menu on the right. */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-6 w-40 max-w-full rounded" />
              <Skeleton className="h-5 w-24 rounded" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
        </div>

        {/* Follower count line. Social links and bio are optional per member,
            so they are left out rather than reserved for everyone. */}
        <Skeleton className="h-5 w-32 rounded" />

        {/* Stats band: belt rank pill + achievements pill. */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <div>
          {/* Tab row — same underline classes as the real `LinkTabs` so the
              rule and the tab baseline do not move. Labels are static per
              locale but their trailing counts are not, so the whole tab is a
              bar; four of them, matching `ProfileTabBar`. */}
          <div className={tabsScrollClass.underline}>
            <div className={tabsRowClass.underline}>
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className={tabItemClass('underline', i === 0)}>
                  <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted align-middle" />
                </span>
              ))}
            </div>
          </div>

          {children}
        </div>
      </div>
    </PageLayout>
  );
}
