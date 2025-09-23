import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/app/[locale]/_components';
import CoordinateQuizClient from './_components/CoordinateQuizClient';

interface CoordinateQuizPageProps {
  params: Promise<{
    locale: 'en' | 'ja';
  }>;
}

export async function generateMetadata({ params }: CoordinateQuizPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('practice.coordinateQuiz.title'),
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizPage({ params }: CoordinateQuizPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const translations = {
    title: t('practice.coordinateQuiz.title'),
    description: t('practice.coordinateQuiz.description'),
    settings: t('practice.coordinateQuiz.settings'),
    timeLimit: t('practice.coordinateQuiz.timeLimit'),
    boardOrientation: t('practice.coordinateQuiz.boardOrientation'),
    white: t('practice.coordinateQuiz.white'),
    black: t('practice.coordinateQuiz.black'),
    random: t('practice.coordinateQuiz.random'),
    start: t('practice.coordinateQuiz.start'),
    clickSquare: t('practice.coordinateQuiz.clickSquare'),
    whiteToMove: t('practice.coordinateQuiz.whiteToMove'),
    blackToMove: t('practice.coordinateQuiz.blackToMove'),
    correct: t('practice.coordinateQuiz.correct'),
    wrong: t('practice.coordinateQuiz.wrong'),
    timeRemaining: t('practice.coordinateQuiz.timeRemaining'),
    finished: t('practice.coordinateQuiz.finished'),
    points: t('practice.coordinateQuiz.points'),
    correctAnswers: t('practice.coordinateQuiz.correctAnswers'),
    accuracy: t('practice.coordinateQuiz.accuracy'),
    timeTaken: t('practice.coordinateQuiz.timeTaken'),
    averageTime: t('practice.coordinateQuiz.averageTime'),
    tryAgain: t('practice.tryAgain'),
    morePractice: t('practice.morePractice'),
    practice: t('navigation.practice'),
  };

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('practice.coordinateQuiz.title')}</PageTitle>
      </div>
      <CoordinateQuizClient locale={locale} translations={translations} />
    </>
  );
}
