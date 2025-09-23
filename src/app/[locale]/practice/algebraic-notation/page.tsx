import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle } from '@/app/[locale]/_components';
import AlgebraicNotationClient from './_components/AlgebraicNotationClient';
import { exercises } from './_lib/algebraic-notation';

interface AlgebraicNotationPageProps {
  params: Promise<{
    locale: 'en' | 'ja';
  }>;
}

export default async function AlgebraicNotationPage({ params }: AlgebraicNotationPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const translations = {
    question: t('practice.algebraicNotation.question'),
    correct: t('practice.algebraicNotation.correct'),
    incorrect: t('practice.algebraicNotation.incorrect'),
    correctAnswerIs: t('practice.algebraicNotation.correctAnswerIs'),
    explanation: t('practice.algebraicNotation.explanation'),
    nextExercise: t('practice.algebraicNotation.nextExercise'),
    complete: t('practice.algebraicNotation.complete'),
    pageTitle: t('practice.algebraicNotation.pageTitle'),
    tryAgain: t('practice.tryAgain'),
    morePractice: t('practice.morePractice'),
    practiceComplete: t('practice.practiceComplete'),
    score: t('practice.score'),
  };

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('practice.algebraicNotation.pageTitle')}</PageTitle>
      </div>
      <AlgebraicNotationClient exercises={exercises} locale={locale} translations={translations} />

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.algebraicNotation.pageTitle') },
          ]}
          locale={locale}
        />
      </div>
    </>
  );
}
