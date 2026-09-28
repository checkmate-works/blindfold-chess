import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import { resolveNativeTileCreatives } from '@/lib/ads/ad';
import { MYPAGE_CHALLENGES_NATIVE_AD_SLOT } from '@/lib/ads/registry';
import { getOptionalUser } from '@/lib/auth';
import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import { CHALLENGE_MENU_TYPES } from '@/lib/db/practice-menu-types';

import { RelatedPracticeSection } from '@/app/[locale]/(public)/practice/_components/RelatedPracticeSection';
import { PRACTICE_CATALOG } from '@/app/[locale]/(public)/practice/_lib/practice-catalog';
import { HelpTourButton, PageLayout } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale, LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { Dashboard } from './_components/Dashboard';

type Props = LocaleSearchPageProps;

/**
 * `?menu=<ChallengeMenuType>` preselects the dashboard's menu — the practice
 * result page's "see your progress" link deep-links here for the module the
 * player just finished. An unknown value is ignored rather than 404ed: the
 * dashboard then falls back to its default (first menu with records), which
 * is a better landing than an error for a hand-edited URL.
 */
function readMenuParam(menu: string | string[] | undefined): ChallengeMenuType | undefined {
  return typeof menu === 'string' && CHALLENGE_MENU_TYPES.includes(menu as ChallengeMenuType)
    ? (menu as ChallengeMenuType)
    : undefined;
}

/**
 * The same-band practice grid for every challenge module, keyed by module.
 *
 * All of them are rendered here and the dashboard shows the one for the
 * module it has selected: the selection is client state that changes without
 * a navigation, and the grid is a server read. The tile is resolved once and
 * handed to each grid rather than read per module.
 */
async function buildRelatedPracticeByMenu(
  locale: Locale
): Promise<Partial<Record<ChallengeMenuType, ReactNode>>> {
  const user = await getOptionalUser();
  const [creative] = await resolveNativeTileCreatives(
    MYPAGE_CHALLENGES_NATIVE_AD_SLOT,
    user?.id ?? null,
    locale
  );
  return Object.fromEntries(
    CHALLENGE_MENU_TYPES.flatMap((menu) => {
      const entry = PRACTICE_CATALOG.find((practice) => practice.menuType === menu);
      if (!entry) return [];
      return [
        [
          menu,
          <RelatedPracticeSection
            key={menu}
            locale={locale}
            practiceId={entry.id}
            ad={{ creative: creative ?? null }}
          />,
        ],
      ];
    })
  );
}

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'metadata.mypageChallenges',
    path: 'mypage/challenges',
    noIndex: true,
  });
}

export default async function ChallengesPage({ params, searchParams }: Props) {
  const [{ locale }, { menu }] = await Promise.all([params, searchParams]);
  const initialMenu = readMenuParam(menu);
  const t = await getTranslations({ locale, namespace: 'MypageChallenges' });
  const tHelp = await getTranslations({ locale, namespace: 'MypageChallenges.help' });
  const relatedPracticeByMenu = await buildRelatedPracticeByMenu(locale);

  const helpSteps: HelpStep[] = [
    {
      targetId: 'challenges-filters',
      title: tHelp('filters.title'),
      description: tHelp('filters.description'),
      side: 'bottom',
      align: 'start',
    },
    {
      targetId: 'challenges-stats',
      title: tHelp('stats.title'),
      description: tHelp('stats.description'),
      side: 'bottom',
      align: 'center',
    },
    {
      targetId: 'challenges-chart',
      title: tHelp('chart.title'),
      description: tHelp('chart.description'),
      side: 'top',
      align: 'center',
    },
    {
      targetId: 'challenges-history',
      title: tHelp('history.title'),
      description: tHelp('history.description'),
      side: 'top',
      align: 'center',
    },
  ];

  return (
    <PageLayout
      title={t('title')}
      titleAction={<HelpTourButton steps={helpSteps} label={tHelp('label')} />}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      {/* Rendered directly (no auth-context gate): the dashboard's Server
          Actions authenticate from cookies on the server, so waiting for the
          client AuthContext to resolve before mounting only chained an extra
          round-trip in front of the first data fetch. */}
      <Dashboard
        locale={locale}
        initialMenu={initialMenu}
        relatedPracticeByMenu={relatedPracticeByMenu}
      />
    </PageLayout>
  );
}
