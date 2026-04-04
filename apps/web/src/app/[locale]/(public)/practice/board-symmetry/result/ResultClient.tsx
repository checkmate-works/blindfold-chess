'use client';

import { notFound, useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardRow } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { LeaderboardPreview } from '@/app/[locale]/(public)/practice/_components/LeaderboardPreview';
import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { SignUpBanner } from '@/app/[locale]/(public)/practice/_components/SignUpBanner';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  adBannerWide?: React.ReactNode;
  adBannerStandard?: React.ReactNode;
  leaderboardRows?: LeaderboardRow[];
  leaderboardDetailPath?: string;
};

export function ResultClient({
  locale,
  adBannerWide,
  adBannerStandard,
  leaderboardRows,
  leaderboardDetailPath,
}: Props) {
  const router = useRouter();
  const t = useTranslations('practice.boardSymmetry');
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
    recreationProgress: tPractice('accuracy'),
    averageTime: tPractice('averageTime'),
    correct: tPractice('correct'),
    incorrect: tPractice('incorrect'),
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
        { label: t('title'), href: '/practice/board-symmetry' },
        { label: tPractice('result') },
      ]}
      containerClassName="space-y-8"
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() => {
          router.push(`/${locale}/practice/board-symmetry/challenge/session`);
        }}
        onExit={() => router.push(`/${locale}/practice/board-symmetry`)}
        locale={locale}
        labels={labels}
        scoreStats={{ correct: score, incorrect: total - score, total }}
        averageTimeText={averageTimeText}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
        afterActions={<SignUpBanner locale={locale} />}
        beforeRelatedContent={adBannerWide}
      />
      {leaderboardRows && leaderboardDetailPath && (
        <LeaderboardPreview
          rows={leaderboardRows}
          detailPath={leaderboardDetailPath}
          locale={locale}
        />
      )}
      {adBannerStandard && <div className="mt-8">{adBannerStandard}</div>}
    </PracticeResultPage>
  );
}
