import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import KnightTour from '../_components/KnightTour';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/knight-tour/session' }),
    title: `${t('practice.knightTour.title')} - ${t('practice.knightTour.session')}`,
    description: t('practice.knightTour.description'),
  };
}

export default async function KnightTourSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  // Parse query parameters
  const startingSquare =
    typeof search.startingSquare === 'string' ? search.startingSquare : undefined;
  const blindfoldMode = search.blindfold === '1';
  const isTutorial = search.mode === 'tutorial';

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.knightTour.title')}</PageTitle>

      <KnightTour
        autoStart={true}
        initialStartingSquare={startingSquare}
        initialBlindfoldMode={blindfoldMode}
        isTutorial={isTutorial}
      />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.knightTour.title'), href: '/practice/knight-tour' },
          { label: t('practice.knightTour.session') },
        ]}
        locale={locale}
      />
    </div>
  );
}
