import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Overrides the profile shell skeleton (`../loading.tsx`) for a page that does
 * not draw the shell: the block page is a plain `PageLayout` with a single
 * confirmation control, so inheriting the parent boundary would flash an
 * identity header and a tab row that never arrive.
 *
 * The title interpolates the member's display name (`blockPageTitle`), which
 * is a runtime value here — unlike the sibling boundaries it renders as a bar
 * rather than as real text.
 */
export default async function ProfileBlockLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'publicProfile' });

  return (
    <PageLayout
      title={
        <span className="inline-block h-7 w-56 max-w-full animate-pulse rounded bg-muted align-middle" />
      }
      locale={locale}
    >
      <div className="space-y-6" aria-hidden="true">
        <SectionTitle>{t('blockSectionTitle')}</SectionTitle>
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </PageLayout>
  );
}
