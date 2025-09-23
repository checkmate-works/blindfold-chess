import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/app/[locale]/_components';
import { LegalMovesClient } from './_components/LegalMovesClient';

interface LegalMovesPageProps {
  params: Promise<{
    locale: 'en' | 'ja';
  }>;
}

export async function generateMetadata({ params }: LegalMovesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('practice.legalMoves.title'),
    description: t('practice.legalMoves.description'),
  };
}

export default async function LegalMovesPage({ params }: LegalMovesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const translations = {
    title: t('practice.legalMoves.title'),
    description: t('practice.legalMoves.description'),
    settings: t('practice.legalMoves.settings'),
    questionCount: t('practice.legalMoves.questionCount'),
    pieceSelection: t('practice.legalMoves.pieceSelection'),
    selectAtLeastOne: t('practice.legalMoves.selectAtLeastOne'),
    pieces: {
      bishop: t('practice.legalMoves.pieces.bishop'),
      knight: t('practice.legalMoves.pieces.knight'),
      rook: t('practice.legalMoves.pieces.rook'),
      queen: t('practice.legalMoves.pieces.queen'),
      king: t('practice.legalMoves.pieces.king'),
    },
    start: t('practice.legalMoves.start'),
    question:
      locale === 'ja' ? '{from}から{to}へ移動できますか？' : 'Can piece move from {from} to {to}?',
    correct: t('practice.legalMoves.correct'),
    incorrect: t('practice.legalMoves.incorrect'),
    legal: t('practice.legalMoves.legal'),
    illegal: t('practice.legalMoves.illegal'),
    practice: t('navigation.practice'),
    practiceComplete: t('practice.practiceComplete'),
    score: t('practice.score'),
    tryAgain: t('practice.tryAgain'),
    morePractice: t('practice.morePractice'),
  };

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('practice.legalMoves.title')}</PageTitle>
      </div>
      <LegalMovesClient locale={locale} translations={translations} />
    </>
  );
}
