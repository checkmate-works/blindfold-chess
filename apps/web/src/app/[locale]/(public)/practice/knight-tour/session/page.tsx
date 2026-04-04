import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

const KnightTour = dynamic<{
  autoStart?: boolean;
  initialStartingSquare?: string;
  initialBlindfoldMode?: boolean;
  isTutorial?: boolean;
}>(() => import('../_components/KnightTour'));

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const title = `${t('practice.knightTour.title')} - ${t('practice.knightTour.session')}`;
  const description = t('practice.knightTour.description');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: 'practice/knight-tour/session',
      title,
      description,
    }),
    title,
    description,
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
    <PracticeSessionPage
      locale={locale}
      title={t('practice.knightTour.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.knightTour.title'), href: '/practice/knight-tour' },
        { label: t('practice.knightTour.session') },
      ]}
    >
      <KnightTour
        autoStart={true}
        initialStartingSquare={startingSquare}
        initialBlindfoldMode={blindfoldMode}
        isTutorial={isTutorial}
      />
    </PracticeSessionPage>
  );
}
