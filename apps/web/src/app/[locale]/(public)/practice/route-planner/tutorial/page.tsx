import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerTutorialSkipLink } from '../_components/RoutePlannerTutorialSkipLink';

const RoutePlannerTutorial = dynamic(() =>
  import('../_components/RoutePlannerTutorial').then((mod) => mod.RoutePlannerTutorial)
);

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/route-planner/tutorial' }),
    title: `${t('practice.routePlanner.title')} - ${t('practice.routePlanner.tutorial.title')}`,
    description: t('practice.routePlanner.description'),
  };
}

export default async function RoutePlannerTutorialPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.routePlanner.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('practice.routePlanner.tutorial.title')}</SectionTitle>

        <div className="text-right">
          <RoutePlannerTutorialSkipLink locale={locale} />
        </div>

        <RoutePlannerTutorial locale={locale} />

        <Divider />

        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.routePlanner.title'), href: '/practice/route-planner' },
            { label: t('practice.routePlanner.tutorial.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
