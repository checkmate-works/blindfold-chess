/**
 * Route Planner Training (ルートプランナートレーニング)
 *
 * @description
 * Untimed training mode for route planning.
 * Problems continue infinitely until the user explicitly ends the session.
 * No timer, no result page - navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) -> Infinite problems -> End button -> Setup + toast
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeSessionPage } from '@/app/[locale]/practice/_components/PracticeSessionPage';

import { RoutePlannerSession } from '../_components/RoutePlannerSession';
import { PIECES } from '../_lib/utils';
import type { PieceType } from '../_lib/utils';

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
    ...generateCanonicalMetadata({ locale, path: 'practice/route-planner/training' }),
    title: `${t('practice.routePlanner.title')} - ${t('practice.modeTraining')}`,
    description: t('practice.routePlanner.description'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function RoutePlannerTrainingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  // Parse allowed pieces
  const piecesParam = search.pieces;
  let allowedPieces: PieceType[] = [];
  if (piecesParam && typeof piecesParam === 'string') {
    const potentialPieces = piecesParam.split('') as PieceType[];
    allowedPieces = potentialPieces.filter((p) => PIECES.includes(p));
  }
  if (allowedPieces.length === 0) {
    allowedPieces = [...PIECES];
  }

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.routePlanner.title')}
      showDivider={false}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        {
          label: t('practice.routePlanner.title'),
          href: '/practice/route-planner',
        },
        { label: t('practice.modeTraining') },
      ]}
    >
      <RoutePlannerSession locale={locale} allowedPieces={allowedPieces} mode="training" />
    </PracticeSessionPage>
  );
}
