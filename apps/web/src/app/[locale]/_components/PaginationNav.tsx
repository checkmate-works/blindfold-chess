import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/app/[locale]/_lib/types';

import { PaginationNavView } from './PaginationNavView';

type PaginationNavProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  locale: Locale;
};

/**
 * Localised pagination bar for Server Component callers.
 *
 * Accepts `locale` as a prop rather than resolving it internally: this app
 * runs no next-intl middleware and never calls `setRequestLocale()`, so the
 * bare `getTranslations(namespace)` shorthand can resolve to the default
 * locale outside a page's own `params` (see getLocaleFromPathnameHeader's
 * TSDoc), and every caller already has `locale` in scope.
 *
 * Async Server Component — must NOT be re-exported from the `_components`
 * barrel (see the barrel convention in apps/web/CLAUDE.md); import it
 * directly from this file. Client Components cannot render this — use
 * `PaginationNavView` with labels from `useTranslations('Common.pagination')`
 * instead (see LeaderboardDetailContent).
 */
export async function PaginationNav({
  currentPage,
  totalPages,
  buildHref,
  locale,
}: PaginationNavProps) {
  const t = await getTranslations({ locale, namespace: 'Common.pagination' });

  return (
    <PaginationNavView
      currentPage={currentPage}
      totalPages={totalPages}
      buildHref={buildHref}
      labels={{
        navLabel: t('navLabel'),
        previous: t('previous'),
        next: t('next'),
        previousPage: t('previousPage'),
        nextPage: t('nextPage'),
      }}
    />
  );
}
