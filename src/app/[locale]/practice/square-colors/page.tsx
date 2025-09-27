import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle } from '@/app/[locale]/_components';
import SquareColorsClient from './_components/SquareColorsClient';
import type { Locale } from '../../_lib/types';

interface SquareColorsPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export default async function SquareColorsPage({ params }: SquareColorsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const translations = {
    title: t('practice.squareColors.title'),
    description: t('practice.squareColors.description'),
    settings: t('practice.squareColors.settings'),
    timeLimit: t('practice.squareColors.timeLimit'),
    seconds: t('practice.squareColors.seconds'),
    start: t('practice.squareColors.start'),
    white: t('practice.squareColors.white'),
    black: t('practice.squareColors.black'),
    correct: t('practice.squareColors.correct'),
    incorrect: t('practice.squareColors.incorrect'),
    finished: t('practice.squareColors.finished'),
    correctAnswers: t('practice.squareColors.correctAnswers'),
    accuracy: t('practice.squareColors.accuracy'),
    timeTaken: t('practice.squareColors.timeTaken'),
    averageTime: t('practice.squareColors.averageTime'),
    tryAgain: t('practice.tryAgain'),
    morePractice: t('practice.morePractice'),
    practice: t('navigation.practice'),
    timeRemaining: t('practice.squareColors.timeRemaining'),
  };

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('practice.squareColors.title')}</PageTitle>
        <p className="text-muted-foreground">{t('practice.squareColors.description')}</p>
      </div>
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
    </>
  );
}
