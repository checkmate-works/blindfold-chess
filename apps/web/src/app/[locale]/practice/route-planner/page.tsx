import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerPageContent } from './_components/RoutePlannerPageContent';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/route-planner' }),
    title: t('practice.routePlanner.title'),
    description: t('practice.routePlanner.description'),
  };
}

export default async function RoutePlannerPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.routePlanner.title')}</PageTitle>

      <RoutePlannerPageContent locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.routePlanner.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
