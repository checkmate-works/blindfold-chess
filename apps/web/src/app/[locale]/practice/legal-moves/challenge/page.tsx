import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeSessionPage } from '@/app/[locale]/practice/_components/PracticeSessionPage';

import type { PieceType } from '../_lib/types';
import LegalMovesSession from './_components/LegalMovesSession';

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
  const defaultPieces: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight'];
  const selectedPieces: PieceType[] = pieces ? (pieces.split(',') as PieceType[]) : defaultPieces;

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
