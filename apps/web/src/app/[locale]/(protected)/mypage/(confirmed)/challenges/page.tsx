import { getTranslations } from 'next-intl/server';

import { HelpTourButton, PageLayout } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { Dashboard } from './_components/Dashboard';

type Props = LocalePageProps;

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'metadata.mypageChallenges',
    path: 'mypage/challenges',
    noIndex: true,
  });
}

export default async function ChallengesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageChallenges' });
  const tHelp = await getTranslations({ locale, namespace: 'MypageChallenges.help' });

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
      <Dashboard locale={locale} />
    </PageLayout>
  );
}
