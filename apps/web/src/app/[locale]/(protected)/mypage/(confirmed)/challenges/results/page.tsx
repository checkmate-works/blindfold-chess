import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { getMissColorClass } from '@/lib/challenge/ui';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { CHALLENGE_MENU_TYPES } from '@/lib/db/practice-menu-types';
import { buildPageHref, clampPage } from '@/lib/pagination';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { getAvailableMenuTypes } from '../_actions/get-challenge-sessions';
import { formatDate } from '../_lib/dashboard-utils';
import { isKeyedMenu } from '../_lib/keyed-menus';
import { getChallengeResultsPaginated, getLatestLeaderboardKey } from '../_lib/queries';
import { ResultsFilters } from './_components/ResultsFilters';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  menu: parseAsString.withDefault(''),
  key: parseAsString.withDefault(''),
});

type Props = LocaleSearchPageProps;

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'MypageChallengeResults',
    path: 'mypage/challenges/results',
    noIndex: true,
  });
}

export default async function ChallengeResultsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageChallengeResults' });
  const tMypage = await getTranslations({ locale, namespace: 'Mypage' });

  const user = await getAuthenticatedUser();
  const { page, menu, key } = await searchParamsCache.parse(searchParams);

  const menuType =
    menu && CHALLENGE_MENU_TYPES.includes(menu as ChallengeMenuType)
      ? (menu as ChallengeMenuType)
      : undefined;
  // A keyed menu (orientation / piece) is always shown through one key, as on
  // the dashboard. When the URL names the menu but not the key — the filter
  // select and the dashboard's "view all" link both do — follow the player's
  // most recent record for it rather than a fixed default that may match
  // nothing they ever played.
  const leaderboardKey =
    key ||
    (menuType && isKeyedMenu(menuType)
      ? await getLatestLeaderboardKey(user.id, menuType)
      : undefined);

  const [{ items, totalPages }, availableMenuTypes] = await Promise.all([
    getChallengeResultsPaginated(user.id, page, menuType, leaderboardKey),
    getAvailableMenuTypes(),
  ]);

  const currentPage = clampPage(page, totalPages);

  const buildHref = buildPageHref(`/${locale}/mypage/challenges/results`, {
    menu: menuType,
    key: leaderboardKey,
  });

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[
        { label: t('breadcrumbMypage'), href: '/mypage' },
        { label: t('breadcrumbChallenges'), href: '/mypage/challenges' },
        { label: t('title') },
      ]}
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      <ResultsFilters
        locale={locale}
        availableMenuTypes={availableMenuTypes}
        currentMenu={menuType}
        currentKey={leaderboardKey}
      />

      {items.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 sm:px-3 text-muted-foreground font-medium">
                  {t('tableDate')}
                </th>
                <th className="text-left py-2 px-2 sm:px-3 text-muted-foreground font-medium whitespace-nowrap">
                  {t('tableMenu')}
                </th>
                <th className="text-right py-2 px-2 sm:px-3 text-muted-foreground font-medium whitespace-nowrap">
                  {t('tableCorrectAnswers')}
                </th>
                <th className="text-right py-2 px-2 sm:px-3 text-muted-foreground font-medium whitespace-nowrap">
                  {t('tableIncorrectAnswers')}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2 px-2 sm:px-3 text-foreground">
                    {formatDate(item.createdAt, locale)}
                  </td>
                  <td className="py-2 px-2 sm:px-3 text-foreground">
                    {tMypage(`menuTypes.${item.menuType}`)}
                  </td>
                  <td className="py-2 px-2 sm:px-3 text-right text-foreground">{item.score}</td>
                  <td
                    className={`py-2 px-2 sm:px-3 text-right ${getMissColorClass(item.incorrectAnswers)}`}
                  >
                    {item.incorrectAnswers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationNav
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={buildHref}
        locale={locale}
      />
    </PageLayout>
  );
}
