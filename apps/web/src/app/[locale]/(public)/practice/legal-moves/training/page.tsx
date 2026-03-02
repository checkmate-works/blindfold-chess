/**
 * Legal Moves Training (合法手トレーニング)
 *
 * @description
 * Untimed training mode for legal move identification.
 * Questions continue infinitely until the user explicitly ends the session.
 * No timer, no result page -- navigates back to setup with a toast notification on end.
 *
 * @flow
 * Setup (training selected) -> Countdown -> Infinite Q&A -> End button -> Setup + toast
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PieceType } from '../_lib/types';

const LegalMovesTrainingSession = dynamic(() => import('./_components/LegalMovesTrainingSession'));

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    pieces?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/legal-moves/training' }),
    title: `${t('practice.legalMoves.title')} - ${t('practice.modeTraining')}`,
    description: t('practice.legalMoves.description'),
  };
}

export default async function LegalMovesTrainingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { pieces } = await searchParams;
  const t = await getTranslations({ locale });

  // Parse selected pieces from URL
  const defaultPieces: PieceType[] = ['k', 'q', 'r', 'b', 'n'];

  let selectedPieces: PieceType[] = defaultPieces;
  if (pieces) {
    const parsedPieces = pieces
      .split(',')
      .filter((p): p is PieceType => defaultPieces.includes(p as PieceType));
    if (parsedPieces.length > 0) {
      selectedPieces = parsedPieces;
    }
  }

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.legalMoves.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.legalMoves.title'), href: '/practice/legal-moves' },
        { label: t('practice.modeTraining') },
      ]}
    >
      <LegalMovesTrainingSession locale={locale} selectedPieces={selectedPieces} />
    </PracticeSessionPage>
  );
}
