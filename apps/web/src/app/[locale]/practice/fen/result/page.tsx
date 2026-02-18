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

export default function FenResultPage(props: Props) {
  const params = use(props.params);
  const { locale } = params;
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

  const breadcrumbItems = [
    { label: tPractice('title'), href: '/practice' },
    { label: t('title'), href: '/practice/fen' },
    { label: tPractice('result') },
  ];

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() => router.push(`/${locale}/practice/fen`)}
        onExit={() => router.push(`/${locale}/practice/fen`)}
        locale={locale}
        labels={{
          practiceComplete: tPractice('practiceComplete'),
          score: searchParams.get('scoreText') || tPractice('score'),
          tryAgain: tPractice('tryAgain'),
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
          relatedLearning: tPractice('relatedLearning'),
        }}
        detailedStats={detailedStats}
        problemResults={results}
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

      <Divider />

      <Breadcrumb items={breadcrumbItems} locale={locale} />
    </div>
  );
}
