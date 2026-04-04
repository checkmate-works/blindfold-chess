'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  adBanner?: React.ReactNode;
};

export function ResultClient({ locale, adBanner }: Props) {
  const t = useTranslations('practice.algebraicNotation');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);

  return (
    <PracticeResultPage
      locale={locale}
      title={t('pageTitle')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/algebraic-notation' },
        { label: tPractice('result') },
      ]}
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() =>
          router.push(`/${locale}/practice/algebraic-notation/session#algebraic-notation-session`)
        }
        onExit={() => router.push(`/${locale}/practice/algebraic-notation`)}
        locale={locale}
        labels={{
          ...getCommonPracticeCompleteLabels(tPractice),
          recreationProgress: tPractice('accuracy'),
          correct: tPractice('correct'),
          incorrect: tPractice('incorrect'),
        }}
        scoreStats={{ correct: score, incorrect: total - score, total }}
        beforeRelatedContent={adBanner}
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
    </PracticeResultPage>
  );
}
