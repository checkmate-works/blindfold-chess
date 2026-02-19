'use client';

import { use, useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeComplete } from '@/app/[locale]/practice/_components/PracticeComplete';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default function AlgebraicNotationResultPage(props: Props) {
  const params = use(props.params);
  const { locale } = params;
  const t = useTranslations('practice.algebraicNotation');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);

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
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() =>
          router.push(`/${locale}/practice/algebraic-notation/session#algebraic-notation-session`)
        }
        onExit={() => router.push(`/${locale}/practice/algebraic-notation`)}
        locale={locale}
        labels={{
          practiceComplete: tPractice('practiceComplete'),
          score: tPractice('score'),
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('changeSettings'),
          recreationProgress: tPractice('accuracy'),
          correct: tPractice('correct'),
          incorrect: tPractice('incorrect'),
          relatedLearning: tPractice('relatedLearning'),
        }}
        detailedStats={detailedStats}
        relatedModule={{
          href: '/learn/notation/algebraic-notation',
          icon: '🔤',
          title: t('viewArticle'),
          description: t('articleDescription'),
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
              href: '/practice/algebraic-notation',
            },
            { label: tPractice('result') },
          ]}
          locale={locale}
        />
      </div>
    </div>
  );
}
