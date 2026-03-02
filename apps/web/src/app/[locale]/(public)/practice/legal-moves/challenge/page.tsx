import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PieceType } from '../_lib/types';

const LegalMovesSession = dynamic(() => import('./_components/LegalMovesSession'));

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    timeLimit?: string;
    pieces?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/legal-moves/challenge' }),
    title: `${t('practice.legalMoves.title')} - ${t('practice.legalMoves.session')}`,
    description: t('practice.legalMoves.description'),
  };
}

export default async function LegalMovesChallengePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { timeLimit, pieces } = await searchParams;
  const t = await getTranslations({ locale });

  const timeLimitValue = timeLimit ? parseInt(timeLimit, 10) : 60;

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
        { label: t('practice.legalMoves.session') },
      ]}
    >
      <LegalMovesSession
        locale={locale}
        initialTimeLimit={timeLimitValue}
        selectedPieces={selectedPieces}
      />
    </PracticeSessionPage>
  );
}
