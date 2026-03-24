import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { SUPPORTED_LOCALES } from '@/config';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import type { PieceType } from '@/app/[locale]/(public)/practice/legal-moves/_lib/types';
import { PIECE_NAME_TO_TYPE } from '@/app/[locale]/(public)/practice/legal-moves/_lib/utils';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

const LegalMovesSession = dynamic(() => import('../_components/LegalMovesSession'));

const VALID_PIECE_NAMES = ['king', 'queen', 'rook', 'bishop', 'knight', 'random'] as const;

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    timeLimit?: string;
    piece?: string;
  }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/legal-moves/challenge/session' }),
    title: `${t('practice.legalMoves.title')} - ${t('practice.legalMoves.session')}`,
    description: t('practice.legalMoves.description'),
  };
}

export default async function LegalMovesChallengeSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { timeLimit, piece } = await searchParams;
  const t = await getTranslations({ locale });

  const timeLimitValue = timeLimit ? parseInt(timeLimit, 10) : 60;

  // Parse selected piece from URL (full name: king, queen, rook, bishop, knight, random)
  const allPieceTypes: PieceType[] = ['k', 'q', 'r', 'b', 'n'];
  const validPieceName =
    piece && (VALID_PIECE_NAMES as readonly string[]).includes(piece) ? piece : 'random';
  const selectedPieces: PieceType[] =
    validPieceName === 'random' ? allPieceTypes : [PIECE_NAME_TO_TYPE[validPieceName]];

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.legalMoves.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.legalMoves.title'), href: '/practice/legal-moves' },
        { label: t('practice.modeTimed'), href: '/practice/legal-moves/challenge' },
        { label: t('practice.legalMoves.session') },
      ]}
    >
      <LegalMovesSession
        locale={locale}
        initialTimeLimit={timeLimitValue}
        selectedPieces={selectedPieces}
        selectedPiece={validPieceName}
      />
    </PracticeSessionPage>
  );
}
