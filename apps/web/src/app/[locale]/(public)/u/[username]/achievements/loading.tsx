import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { Divider, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { BreadcrumbSkeleton } from '@/app/[locale]/_components/Breadcrumb';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * One placeholder category: every seeded badge definition is a monthly
 * leaderboard badge, so the real page draws a single category heading.
 */
const CARD_COUNT = 4;

/**
 * Overrides the profile shell skeleton (`../loading.tsx`) for a page that does
 * not draw the shell: the achievements page is a plain `PageLayout` with badge
 * sections, so inheriting the parent boundary would flash an identity header
 * and a tab row that never arrive.
 *
 * Mirrors `ProfileAchievements`: a category heading over a one-column (two at
 * `sm:`) grid of bordered cards, each an icon beside a name line and a month
 * line, with the same `space-y-3` / `space-y-2` rhythm. The trailing
 * breadcrumb is drawn by hand because `PageLayout` only renders a real one;
 * the display name is unknown here, so that crumb is a bar.
 */
export default async function ProfileAchievementsLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <PageLayout title={t('achievementsPageTitle')} locale={locale}>
      <div className="space-y-3" aria-hidden="true">
        <SectionTitle>{t('achievementsSection')}</SectionTitle>
        <div className="space-y-2">
          <Skeleton className="h-5 w-24 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: CARD_COUNT }, (_, card) => (
              <div
                key={card}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <Skeleton className="size-6 shrink-0 rounded" />
                <div className="min-w-0 flex-1">
                  <div className="flex h-5 items-center">
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </div>
                  <div className="mt-0.5 flex h-4 items-center">
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="!mt-4 space-y-4">
        <Divider />
        <BreadcrumbSkeleton
          crumbs={[{ widthClass: 'w-20' }, { label: t('achievementsPageTitle'), current: true }]}
          density="compact"
        />
      </div>
    </PageLayout>
  );
}
