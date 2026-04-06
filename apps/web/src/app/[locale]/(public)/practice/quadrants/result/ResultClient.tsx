'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  adBanner?: React.ReactNode;
};

export function ResultClient({ locale, adBanner }: Props) {
  const t = useTranslations('practice.quadrantAnchors');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);
  const time = parseFloat(searchParams.get('time') || '0');

  const timePerQuestion = total > 0 ? time / total : 0;
  const averageTimeText =
    total > 0 ? tPractice('secondsFormat', { seconds: timePerQuestion.toFixed(1) }) : undefined;

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/quadrants' },
        { label: tPractice('result') },
      ]}
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() => router.push(`/${locale}/practice/quadrants/challenge`)}
        onExit={() => router.push(`/${locale}/practice/quadrants`)}
        locale={locale}
        labels={{
          ...getCommonPracticeCompleteLabels(tPractice),
          score: tPractice('correctAnswers'),
        }}
        scoreStats={{ correct: score, incorrect: total - score, total }}
        averageTimeText={averageTimeText}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      />

      {adBanner}

      <PracticeLayout>
        <PracticePanel className="p-6 mt-8 space-y-3">
          <SectionTitle>{tPractice('relatedLearning')}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardLink
              href="/learn/coordinates/anchor-squares"
              icon="⚓"
              title={t('articles.anchorSquares.title')}
              description={t('articles.anchorSquares.description')}
              locale={locale}
            />
          </div>
        </PracticePanel>
      </PracticeLayout>
    </PracticeResultPage>
  );
}
