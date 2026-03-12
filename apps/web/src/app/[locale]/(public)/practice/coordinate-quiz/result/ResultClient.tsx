'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function ResultClient({ locale }: Props) {
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
  const tryAgainUrl = `/${locale}/practice/coordinate-quiz/challenge?${tryAgainParams.toString()}`;

  // Calculate average time if total > 0
  const averageTime = total > 0 ? (timeElapsed / total).toFixed(1) : '0.0';

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/coordinate-quiz' },
        { label: tPractice('result') },
      ]}
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() => router.push(tryAgainUrl)}
        onExit={() => router.push(`/${locale}/practice/coordinate-quiz`)}
        locale={locale}
        labels={{
          ...getCommonPracticeCompleteLabels(tPractice),
          averageTime: tPractice('averageTime'),
          recreationProgress: tPractice('accuracy'),
          correct: tPractice('correct'),
          incorrect: tPractice('incorrect'),
        }}
        averageTimeText={tPractice('secondsFormat', { seconds: averageTime })}
        scoreStats={{ correct: score, incorrect: total - score, total }}
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
    </PracticeResultPage>
  );
}
