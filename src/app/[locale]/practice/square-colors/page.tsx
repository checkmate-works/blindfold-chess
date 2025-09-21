import { getTranslations } from 'next-intl/server';
import { Breadcrumb } from '@/app/[locale]/_components';
import SquareColorsClient from './_components/SquareColorsClient';

interface SquareColorsPageProps {
  params: Promise<{
    locale: 'en' | 'ja';
  }>;
}

export default async function SquareColorsPage({ params }: SquareColorsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  // Get learn article metadata for related learning section
  const learnArticleMetadata =
    locale === 'ja'
      ? {
          title: 'マス目の色の理解',
          description: '駒の連携を向上させるためのチェス盤の交互色パターンをマスターしましょう',
        }
      : {
          title: 'Understanding Square Colors',
          description:
            "Master the chessboard's alternating color pattern for better piece coordination",
        };

  const translations = {
    title: t('practice.squareColors.title'),
    description: t('practice.squareColors.description'),
    settings: t('practice.squareColors.settings'),
    questionCount: t('practice.squareColors.questionCount'),
    start: t('practice.squareColors.start'),
    white: t('practice.squareColors.white'),
    black: t('practice.squareColors.black'),
    correct: t('practice.squareColors.correct'),
    incorrect: t('practice.squareColors.incorrect'),
    practiceComplete: t('practice.practiceComplete'),
    score: t('practice.score'),
    tryAgain: t('practice.tryAgain'),
    morePractice: t('practice.morePractice'),
    relatedLearning: t('learn.relatedLearning'),
    learnTitle: learnArticleMetadata.title,
    learnDescription: learnArticleMetadata.description,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SquareColorsClient locale={locale} translations={translations} />

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.squareColors.title') },
          ]}
          locale={locale}
        />
      </div>
    </div>
  );
}
