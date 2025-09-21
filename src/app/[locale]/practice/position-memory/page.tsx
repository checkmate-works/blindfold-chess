import { getTranslations } from 'next-intl/server';
import { PositionMemoryClient } from './_components/PositionMemoryClient';

interface PositionMemoryPageProps {
  params: Promise<{
    locale: 'en' | 'ja';
  }>;
}

export async function generateMetadata({ params }: PositionMemoryPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('practice.positionMemory.title'),
    description: t('practice.positionMemory.description'),
  };
}

export default async function PositionMemoryPage({ params }: PositionMemoryPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const translations = {
    title: t('practice.positionMemory.title'),
    description: t('practice.positionMemory.description'),
    settings: t('practice.positionMemory.settings'),
    timeLimit: t('practice.positionMemory.timeLimit'),
    seconds: t('practice.positionMemory.seconds'),
    problemCount: t('practice.positionMemory.problemCount'),
    problems: t('practice.positionMemory.problems'),
    shuffle: t('practice.positionMemory.shuffle'),
    start: t('practice.positionMemory.start'),
    memorize: t('practice.positionMemory.memorize'),
    recreate: t('practice.positionMemory.recreate'),
    result: t('practice.positionMemory.result'),
    memorizing: t('practice.positionMemory.memorizing'),
    timeRemaining: t('practice.positionMemory.timeRemaining'),
    memorized: t('practice.positionMemory.memorized'),
    recreatePosition: t('practice.positionMemory.recreatePosition'),
    submit: t('practice.positionMemory.submit'),
    accuracy: t('practice.positionMemory.accuracy'),
    correct: t('practice.positionMemory.correct'),
    extra: t('practice.positionMemory.extra'),
    score: t('practice.positionMemory.score'),
    nextProblem: t('practice.positionMemory.nextProblem'),
    viewResults: t('practice.positionMemory.viewResults'),
    original: t('practice.positionMemory.original'),
    yourRecreation: t('practice.positionMemory.yourRecreation'),
    practice: t('navigation.practice'),
    practiceComplete: t('practice.practiceComplete'),
    tryAgain: t('practice.tryAgain'),
    morePractice: t('practice.morePractice'),
    pieceNames: {
      K: t('practice.positionMemory.pieceNames.K'),
      Q: t('practice.positionMemory.pieceNames.Q'),
      R: t('practice.positionMemory.pieceNames.R'),
      B: t('practice.positionMemory.pieceNames.B'),
      N: t('practice.positionMemory.pieceNames.N'),
      P: t('practice.positionMemory.pieceNames.P'),
      k: t('practice.positionMemory.pieceNames.k'),
      q: t('practice.positionMemory.pieceNames.q'),
      r: t('practice.positionMemory.pieceNames.r'),
      b: t('practice.positionMemory.pieceNames.b'),
      n: t('practice.positionMemory.pieceNames.n'),
      p: t('practice.positionMemory.pieceNames.p'),
    },
    scoreDescriptions: {
      correct: locale === 'ja' ? '{square}の{piece}は正解' : '{piece} on {square} is correct',
      wrongPiece:
        locale === 'ja'
          ? '{square}は{expected}ではなく{actual}'
          : '{square} has {actual} instead of {expected}',
      missing: locale === 'ja' ? '{square}の{piece}が不足' : '{piece} is missing from {square}',
      extra: locale === 'ja' ? '{square}に余分な{piece}' : 'Extra {piece} on {square}',
    },
  };

  return <PositionMemoryClient locale={locale} translations={translations} />;
}
