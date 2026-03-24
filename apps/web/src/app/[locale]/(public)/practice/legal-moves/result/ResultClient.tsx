'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { SignUpBanner } from '@/app/[locale]/(public)/practice/_components/SignUpBanner';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
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
  const piece = searchParams.get('piece');

  // Calculate average time if total > 0
  const averageTime = total > 0 ? (timeElapsed / total).toFixed(1) : '0.0';

  // Try Again: 同じ設定でセッションを即座にやり直す
  const sessionParams = new URLSearchParams();
  if (timeLimit) sessionParams.set('timeLimit', timeLimit);
  if (piece) sessionParams.set('piece', piece);
  const tryAgainUrl = `/${locale}/practice/legal-moves/challenge/session?${sessionParams.toString()}`;

  // Change Settings: チャレンジセットアップに遷移（設定を引き継ぐ）
  const settingsParams = new URLSearchParams();
  if (piece) settingsParams.set('piece', piece);
  const changeSettingsUrl = `/${locale}/practice/legal-moves/challenge?${settingsParams.toString()}`;

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
        onTryAgain={() => (window.location.href = tryAgainUrl)}
        onExit={() => router.push(changeSettingsUrl)}
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
        afterActions={<SignUpBanner locale={locale} />}
      />
    </PracticeResultPage>
  );
}
