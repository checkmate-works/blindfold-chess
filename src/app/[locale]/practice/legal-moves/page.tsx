import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle } from '@/app/[locale]/_components';
import { LegalMovesClient } from './_components/LegalMovesClient';
import type { Locale } from '../../_lib/types';

interface LegalMovesPageProps {
  params: Promise<{
    locale: Locale;
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
    timeLimit: t('practice.legalMoves.timeLimit'),
    seconds: t('practice.legalMoves.seconds'),
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
    finished: t('practice.legalMoves.finished'),
    correctAnswers: t('practice.legalMoves.correctAnswers'),
    accuracy: t('practice.legalMoves.accuracy'),
    timeTaken: t('practice.legalMoves.timeTaken'),
    averageTime: t('practice.legalMoves.averageTime'),
    tryAgain: t('practice.tryAgain'),
    morePractice: t('practice.morePractice'),
    timeRemaining: t('practice.legalMoves.timeRemaining'),
  };

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('practice.legalMoves.title')}</PageTitle>
        <p className="text-muted-foreground">{t('practice.legalMoves.description')}</p>
      </div>
      <LegalMovesClient locale={locale} translations={translations} />

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.legalMoves.title') },
          ]}
          locale={locale}
        />
      </div>
    </>
  );
}
