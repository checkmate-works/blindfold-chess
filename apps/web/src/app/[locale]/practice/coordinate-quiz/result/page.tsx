'use client';

import { use, useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { Breadcrumb, Divider } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeComplete } from '@/app/[locale]/practice/_components/PracticeComplete';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default function CoordinateQuizResultPage(props: Props) {
  const params = use(props.params);
  const { locale } = params;
  const t = useTranslations('practice.coordinateQuiz');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);
  const timeElapsed = parseInt(searchParams.get('time') || '0', 10);

  const timeLimit = searchParams.get('timeLimit');
  const orientation = searchParams.get('orientation');
  const speed = searchParams.get('speed');

  // Construct URL for retrying with same settings
  const tryAgainParams = new URLSearchParams();
  if (timeLimit) tryAgainParams.set('timeLimit', timeLimit);
  if (orientation) tryAgainParams.set('boardOrientation', orientation);
  if (speed) tryAgainParams.set('feedbackSpeed', speed);
  const tryAgainUrl = `/${locale}/practice/coordinate-quiz/session?${tryAgainParams.toString()}`;

  // Calculate average time if total > 0
  const averageTime = total > 0 ? (timeElapsed / total).toFixed(1) : '0.0';

  const detailedStats = useMemo(
    () => ({
      correctPieces: score,
      totalPieces: total,
      incorrectPieces: total - score,
      missingPieces: 0,
      extraPieces: 0,
    }),
    [score, total]
  );

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() => router.push(tryAgainUrl)}
        onExit={() => router.push(`/${locale}/practice/coordinate-quiz`)}
        locale={locale}
        labels={{
          practiceComplete: tPractice('practiceComplete'),
          score: tPractice('score'),
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('changeSettings'),
          averageTime: tPractice('averageTime'),
          recreationProgress: tPractice('accuracy'),
          correct: tPractice('correct'),
          incorrect: tPractice('incorrect'),
          relatedLearning: tPractice('relatedLearning'),
        }}
        averageTimeText={tPractice('secondsFormat', { seconds: averageTime })}
        detailedStats={detailedStats}
        relatedModule={{
          href: '/learn/coordinates/coordinate-confusion',
          icon: '🔄',
          title: t('articles.coordinateConfusion.title'),
          description: t('articles.coordinateConfusion.description'),
        }}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      />

      <Divider />

      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: tPractice('title'), href: '/practice' },
            {
              label: t('title'),
              href: '/practice/coordinate-quiz',
            },
            { label: tPractice('result') },
          ]}
          locale={locale}
        />
      </div>
    </div>
  );
}
