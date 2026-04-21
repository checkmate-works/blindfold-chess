import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { getMissColorClass } from '@/lib/challenge/ui';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { CHALLENGE_MENU_TYPES } from '@/lib/db/practice-menu-types';

import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { getAvailableMenuTypes } from '../_actions/get-challenge-sessions';
import { formatDate } from '../_lib/dashboard-utils';
import { getChallengeResultsPaginated } from '../_lib/queries';
import { ResultsFilters } from './_components/ResultsFilters';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  menu: parseAsString.withDefault(''),
  key: parseAsString.withDefault(''),
});

type Props = LocaleSearchPageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageChallengeResults' });

  return {
    title: resolveTitle(t('title'), locale),
    description: t('description'),
    robots: { index: false, follow: false },
  };
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
  const leaderboardKey = key || undefined;

  const [{ items, totalPages }, availableMenuTypes] = await Promise.all([
    getChallengeResultsPaginated(user.id, page, menuType, leaderboardKey),
    getAvailableMenuTypes(),
  ]);

  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (menuType) params.set('menu', menuType);
    if (leaderboardKey) params.set('key', leaderboardKey);
    const qs = params.toString();
    return `/${locale}/mypage/challenges/results${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
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

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[
            { label: t('breadcrumbMypage'), href: '/mypage' },
            { label: t('breadcrumbChallenges'), href: '/mypage/challenges' },
            { label: t('title') },
          ]}
        />
      </PagePanel>
    </div>
  );
}
