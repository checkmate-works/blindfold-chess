'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_components/get-common-practice-labels';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function ResultClient({ locale }: Props) {
  const t = useTranslations('practice.legalMoves');
  const tPractice = useTranslations('practice');
  const tNavigation = useTranslations('navigation');
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);
  const timeElapsed = parseInt(searchParams.get('time') || '0', 10);

  // Params for retry
  const timeLimit = searchParams.get('timeLimit');
  const pieces = searchParams.get('pieces');

  // Calculate average time if total > 0
  const averageTime = total > 0 ? (timeElapsed / total).toFixed(1) : '0.0';

  // Construct retry URL
  const retryParams = new URLSearchParams();
  if (timeLimit) retryParams.set('timeLimit', timeLimit);
  if (pieces) retryParams.set('pieces', pieces);

  const retryUrl = `/${locale}/practice/legal-moves/challenge?${retryParams.toString()}`;

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tNavigation('practice'), href: '/practice' },
        { label: t('title'), href: '/practice/legal-moves' },
        { label: tPractice('result') },
      ]}
      containerClassName="space-y-8"
      dividerClassName="my-8"
    >
      <PracticeComplete
        score={score}
        total={total}
        // Full page reload to reset useRef-based question generation state in LegalMovesSession
        onTryAgain={() => (window.location.href = retryUrl)}
        onExit={() => router.push(`/${locale}/practice/legal-moves`)}
        locale={locale}
        labels={{
          ...getCommonPracticeCompleteLabels(tPractice),
          averageTime: tPractice('averageTime'),
          recreationProgress: t('accuracy'),
          correct: t('correct'),
          incorrect: t('incorrect'),
        }}
        averageTimeText={tPractice('secondsFormat', { seconds: averageTime })}
        scoreStats={{ correct: score, incorrect: total - score, total }}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      />
    </PracticeResultPage>
  );
}
