import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageDescription, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import KnightTour from './_components/KnightTour';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/knight-tour' }),
    title: t('practice.knightTour.title'),
    description: t('practice.knightTour.description'),
  };
}

export default async function KnightTourPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.knightTour.title')}</PageTitle>

      <PageDescription>{t('practice.knightTour.description')}</PageDescription>

      <KnightTour locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.knightTour.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
