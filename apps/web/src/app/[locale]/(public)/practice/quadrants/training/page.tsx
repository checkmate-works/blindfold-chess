/**
 * Quadrant Anchors Training (象限アンカートレーニング)
 *
 * @description
 * Untimed training mode for quadrant identification.
 * Problems continue infinitely until the user explicitly ends the session.
 * No timer, no result page - navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) -> Infinite problems -> End button -> Setup + toast
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeSessionPage } from '@/app/[locale]/practice/_components/PracticeSessionPage';

const QuadrantPlaying = dynamic(() => import('../_components/QuadrantPlaying'));

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/quadrants/training' }),
    title: `${t('practice.quadrantAnchors.title')} - ${t('practice.modeTraining')}`,
    description: t('practice.quadrantAnchors.description'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function QuadrantTrainingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  const orientationParam = search.orientation;
  const initialOrientation =
    (typeof orientationParam === 'string'
      ? (orientationParam as 'white' | 'black' | 'random')
      : undefined) || 'white';

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.quadrantAnchors.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.quadrantAnchors.title'), href: '/practice/quadrants' },
        { label: t('practice.modeTraining') },
      ]}
    >
      <div className="max-w-3xl mx-auto">
        <QuadrantPlaying
          key={initialOrientation}
          initialProblemCount={0}
          initialOrientation={initialOrientation}
          mode="training"
        />
      </div>
    </PracticeSessionPage>
  );
}
