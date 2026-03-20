'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  adBanner?: React.ReactNode;
};

export function ResultClient({ locale, adBanner }: Props) {
  const t = useTranslations('practice.fen');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const dataParam = searchParams.get('data');

  const { score, total, results, detailedStats } = useMemo(() => {
    if (!dataParam) {
      return { score: 0, total: 0, results: [], detailedStats: null };
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      return parsed;
    } catch {
      return { score: 0, total: 0, results: [], detailedStats: null };
    }
  }, [dataParam]);

  return (
    <PracticeResultPage
      locale={locale}
      title={t('pageTitle')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/fen' },
        { label: tPractice('result') },
      ]}
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() => router.push(`/${locale}/practice/fen`)}
        onExit={() => router.push(`/${locale}/practice/fen`)}
        locale={locale}
        labels={{
          ...getCommonPracticeCompleteLabels(tPractice),
          score: searchParams.get('scoreText') || tPractice('score'),
          morePractice: tPractice('morePractice'),
          recreationProgress: t('recreationProgress'),
          correct: t('correct'),
          incorrect: t('incorrect'),
          missing: t('missing'),
          extra: t('extra'),
          extraDescription: t('extraDescription'),
          problemDetails: t('problemDetails'),
          problem: t('problem'),
          original: t('original'),
          yourRecreation: t('yourRecreation'),
          skipped: t('skipped'),
        }}
        scoreStats={detailedStats}
        problemResults={results}
        beforeRelatedContent={adBanner}
        relatedModule={{
          href: '/learn/notation/fen-notation',
          icon: '📝',
          title: t('viewArticle'),
          description: t('articleDescription'),
        }}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      />
    </PracticeResultPage>
  );
}
