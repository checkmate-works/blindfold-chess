'use client';

import { use, useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { notFound, useRouter, useSearchParams } from 'next/navigation';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeComplete } from '@/app/[locale]/practice/_components/PracticeComplete';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default function SquareColorsResultPage({ params }: Props) {
  const { locale } = use(params);
  const router = useRouter();
  const t = useTranslations('practice.squareColors');
  const tPractice = useTranslations('practice');

  const searchParams = useSearchParams();

  // Validate locale
  if (!['en', 'ja'].includes(locale)) {
    notFound();
  }

  // Parse query params
  const time = parseFloat(searchParams.get('time') || '0');
  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);
  const timeLimitParam = parseInt(searchParams.get('timeLimit') || '0', 10);
  // Default to 60 seconds if missing or 0
  const timeLimit = timeLimitParam > 0 ? timeLimitParam : 60;
  const correct = score;
  const incorrect = total - score;

  // Calculate average time per question
  const timePerQuestion = total > 0 ? time / total : 0;

  // Prepare stats for PracticeComplete
  const detailedStats = useMemo(
    () => ({
      correctPieces: correct,
      totalPieces: total,
      incorrectPieces: incorrect,
      missingPieces: 0,
      extraPieces: 0,
    }),
    [correct, total, incorrect]
  );

  // Prepare labels
  const labels = useMemo(
    () => ({
      practiceComplete: tPractice('practiceComplete'),
      score: t('accuracy'), // Reuse existing "Accuracy" label which maps to "正解率" in JA
      recreationProgress: t('accuracy'),
      averageTime: t('averageTime'),

      // For the bar graph labels:
      correct: t('correct'),
      incorrect: t('incorrect'),

      tryAgain: tPractice('tryAgain'),
      morePractice: tPractice('changeSettings'),
      relatedLearning: tPractice('relatedLearning'),
    }),
    [t, tPractice]
  );

  // Define related module
  const relatedModule = {
    href: '/learn/board-visualization/square-colors',
    icon: '🎨',
    title: t('viewArticle'),
    description: t('articleDescription'),
    sectionTitle: t('requiredKnowledge'),
  };

  // Format average time text
  const averageTimeText =
    total > 0 ? tPractice('secondsFormat', { seconds: timePerQuestion.toFixed(1) }) : undefined;

  return (
    <div className="container py-8">
      <PageTitle>{t('title')}</PageTitle>

      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() =>
          router.push(`/${locale}/practice/square-colors/session?timeLimit=${timeLimit}`)
        }
        onExit={() => router.push(`/${locale}/practice/square-colors`)}
        locale={locale}
        labels={labels}
        detailedStats={detailedStats}
        relatedModule={relatedModule}
        averageTimeText={averageTimeText}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      />

      <Divider className="my-8" />

      <Breadcrumb
        items={[
          { label: tPractice('title'), href: '/practice' },
          { label: t('title'), href: '/practice/square-colors' },
          { label: tPractice('result') },
        ]}
        locale={locale}
      />
    </div>
  );
}
