import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { PageLayout } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Overrides the profile shell skeleton (`../loading.tsx`) for a page that does
 * not draw the shell: the followers page is a plain `PageLayout` with a
 * `UserCard` list, so inheriting the parent boundary would flash an identity
 * header and a tab row that never arrive.
 *
 * Five rows — the page's own page size is larger, but a boundary that fills
 * the viewport is enough; over-drawing rows a short follower list will never
 * have costs more than it saves.
 */
export default async function ProfileFollowersLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <PageLayout title={t('followersPageTitle')} locale={locale}>
      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-40 max-w-full rounded" />
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
