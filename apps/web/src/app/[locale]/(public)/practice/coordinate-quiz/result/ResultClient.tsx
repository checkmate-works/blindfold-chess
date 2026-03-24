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
  adBanner?: React.ReactNode;
};

export function ResultClient({ locale, adBanner }: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);
  const timeElapsed = parseInt(searchParams.get('time') || '0', 10);

  const orientation = searchParams.get('orientation');
  const speed = searchParams.get('speed');

  // Try Again: 同じ設定でセッションを即座にやり直す
  const sessionParams = new URLSearchParams();
  if (orientation) sessionParams.set('boardOrientation', orientation);
  if (speed) sessionParams.set('feedbackSpeed', speed);
  const tryAgainUrl = `/${locale}/practice/coordinate-quiz/challenge/session?${sessionParams.toString()}`;

  // Change Settings: チャレンジセットアップに遷移（設定を引き継ぐ）
  const settingsParams = new URLSearchParams();
  if (orientation) settingsParams.set('boardOrientation', orientation);
  if (speed) settingsParams.set('feedbackSpeed', speed);
  const changeSettingsUrl = `/${locale}/practice/coordinate-quiz/challenge?${settingsParams.toString()}`;

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
        onExit={() => router.push(changeSettingsUrl)}
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
        beforeRelatedContent={adBanner}
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
        afterActions={<SignUpBanner locale={locale} />}
      />
    </PracticeResultPage>
  );
}
