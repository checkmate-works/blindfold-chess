'use client';

import { useTranslations } from 'next-intl';
import { notFound, useRouter, useSearchParams } from 'next/navigation';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  adBanner?: React.ReactNode;
};

export function ResultClient({ locale, adBanner }: Props) {
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

  // Calculate average time per question
  const timePerQuestion = total > 0 ? time / total : 0;

  // Prepare labels
  const labels = {
    ...getCommonPracticeCompleteLabels(tPractice),
    score: t('accuracy'), // Reuse existing "Accuracy" label which maps to "正解率" in JA
    recreationProgress: t('accuracy'),
    averageTime: t('averageTime'),
    correct: t('correct'),
    incorrect: t('incorrect'),
  };

  // Define related module
  const relatedModule = {
    href: '/learn/coordinates/square-colors',
    icon: '🎨',
    title: t('viewArticle'),
    description: t('articleDescription'),
    sectionTitle: t('requiredKnowledge'),
  };

  // Format average time text
  const averageTimeText =
    total > 0 ? tPractice('secondsFormat', { seconds: timePerQuestion.toFixed(1) }) : undefined;

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/square-colors' },
        { label: tPractice('result') },
      ]}
      containerClassName="space-y-8"
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() => {
          router.push(`/${locale}/practice/square-colors/challenge`);
        }}
        onExit={() => router.push(`/${locale}/practice/square-colors`)}
        locale={locale}
        labels={labels}
        scoreStats={{ correct: score, incorrect: total - score, total }}
        beforeRelatedContent={adBanner}
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
