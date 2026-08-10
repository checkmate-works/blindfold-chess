import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Overrides the profile shell skeleton (`../loading.tsx`) for a page that does
 * not draw the shell: the achievements page is a plain `PageLayout` with badge
 * sections, so inheriting the parent boundary would flash an identity header
 * and a tab row that never arrive.
 */
export default async function ProfileAchievementsLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <PageLayout title={t('achievementsPageTitle')} locale={locale}>
      <div className="space-y-6" aria-hidden="true">
        <SectionTitle>{t('achievementsSection')}</SectionTitle>
        {Array.from({ length: 2 }, (_, section) => (
          <div key={section} className="space-y-3">
            <Skeleton className="h-5 w-32 rounded" />
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 4 }, (_, badge) => (
                <Skeleton key={badge} className="h-16 w-16 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
