'use client';

import { useTranslations } from 'next-intl';
import { notFound, useRouter, useSearchParams } from 'next/navigation';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_components/get-common-practice-labels';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function ResultClient({ locale }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.boardSymmetry');
  const tPractice = useTranslations('practice');
  const tNavigation = useTranslations('navigation');
  const searchParams = useSearchParams();

  // Validate locale
  if (!['en', 'ja'].includes(locale)) {
    notFound();
  }

  // Parse query params
  const timeLimitParam = parseInt(searchParams.get('timeLimit') || '0', 10);
  // Default to 60 seconds if missing or 0
  const timeLimit = timeLimitParam > 0 ? timeLimitParam : 60;

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);
  const time = parseFloat(searchParams.get('time') || '0');

  // Calculate average time per question
  const timePerQuestion = total > 0 ? time / total : 0;

  // Prepare labels
  const labels = {
    ...getCommonPracticeCompleteLabels(tPractice),
    recreationProgress: tPractice('accuracy'),
    averageTime: tPractice('averageTime'),
    correct: tPractice('correct'),
    incorrect: tPractice('incorrect'),
  };

  // Define related module
  const relatedModule = {
    href: '/learn/coordinates/board-symmetry',
    icon: '↔️',
    title: t('viewArticle'),
    description: t('articleDescription'),
  };

  // Format average time text
  const averageTimeText =
    total > 0 ? tPractice('secondsFormat', { seconds: timePerQuestion.toFixed(1) }) : undefined;

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tNavigation('practice'), href: '/practice' },
        { label: t('title'), href: '/practice/board-symmetry' },
        { label: tPractice('result') },
      ]}
      containerClassName="space-y-8"
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() => {
          const tryAgainParams = new URLSearchParams();
          if (timeLimit) tryAgainParams.set('timeLimit', timeLimit.toString());
          router.push(`/${locale}/practice/board-symmetry/session?${tryAgainParams.toString()}`);
        }}
        onExit={() => router.push(`/${locale}/practice/board-symmetry`)}
        locale={locale}
        labels={labels}
        scoreStats={{ correct: score, incorrect: total - score, total }}
        relatedModule={relatedModule}
        averageTimeText={averageTimeText}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      />
    </PracticeResultPage>
  );
}
