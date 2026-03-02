/**
 * Square Colors Training (マスの色トレーニング)
 *
 * @description
 * Untimed training mode for square color identification.
 * Questions continue infinitely until the user explicitly ends the session.
 * No timer, no result page — navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) → Countdown → Infinite Q&A → End button → Setup + toast
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeSessionPage } from '@/app/[locale]/practice/_components/PracticeSessionPage';

const SquareColorsTrainingSession = dynamic(
  () => import('./_components/SquareColorsTrainingSession')
);

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/square-colors/training' }),
    title: `${t('practice.squareColors.title')} - ${t('practice.modeTraining')}`,
    description: t('practice.squareColors.description'),
  };
}

export default async function SquareColorsTrainingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.squareColors.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.squareColors.title'), href: '/practice/square-colors' },
        { label: t('practice.modeTraining') },
      ]}
    >
      <SquareColorsTrainingSession locale={locale} />
    </PracticeSessionPage>
  );
}
