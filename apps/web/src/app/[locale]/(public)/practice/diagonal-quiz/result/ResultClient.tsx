'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import type { LeaderboardRow } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { LeaderboardPreview } from '@/app/[locale]/(public)/practice/_components/LeaderboardPreview';
import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizProblemList } from '../_components/DiagonalQuizProblemList';
import type { QuestionResult } from '../_components/DiagonalQuizProblemList';

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
  const t = useTranslations('practice.diagonalQuiz');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '0', 10);
  const timeElapsed = parseInt(searchParams.get('time') || '0', 10);
  const dataParam = searchParams.get('data');

  const questionResults = useMemo(() => {
    if (!dataParam) return [];
    try {
      // Decode and parse minified JSON
      // Minified keys: s=square, c=isCorrect, dc=isDiagonalCorrect, ac=isAntiDiagonalCorrect
      // cd=correctDiagonal, ca=correctAntiDiagonal, ud=userDiagonal, ua=userAntiDiagonal
      type SerializedResult = {
        s: string;
        c: number;
        dc: number;
        ac: number;
        cd: string;
        ca: string;
        ud?: string;
        ua?: string;
      };
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      return parsed.map((item: SerializedResult) => ({
        square: item.s,
        isCorrect: item.c === 1,
        isDiagonalCorrect: item.dc === 1,
        isAntiDiagonalCorrect: item.ac === 1,
        correctDiagonal: item.cd,
        correctAntiDiagonal: item.ca,
        userDiagonal: item.ud,
        userAntiDiagonal: item.ua,
      })) as QuestionResult[];
    } catch (e) {
      console.error('Failed to parse result data', e);
      return [];
    }
  }, [dataParam]);

  const averageTime =
    questionResults.length > 0 ? (timeElapsed / questionResults.length).toFixed(1) : '0.0';

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/diagonal-quiz' },
        { label: tPractice('result') },
      ]}
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() => router.push(`/${locale}/practice/diagonal-quiz/challenge/session`)}
        onExit={() => router.push(`/${locale}/practice/diagonal-quiz`)}
        locale={locale}
        labels={{
          ...getCommonPracticeCompleteLabels(tPractice),
          averageTime: tPractice('averageTime'),
        }}
        averageTimeText={tPractice('secondsFormat', { seconds: averageTime })}
        beforeRelatedContent={adBannerWide}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      >
        <div className="mt-8">
          <DiagonalQuizProblemList results={questionResults} />
        </div>
      </PracticeComplete>
      {leaderboardRows && leaderboardDetailPath && (
        <LeaderboardPreview
          rows={leaderboardRows}
          detailPath={leaderboardDetailPath}
          locale={locale}
        />
      )}
      {adBannerStandard && <div className="mt-8">{adBannerStandard}</div>}
      <PracticeLayout>
        <PracticePanel className="p-6 mt-8 space-y-3">
          <SectionTitle>{tPractice('relatedLearning')}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardLink
              href="/learn/moves/bishop-movement"
              icon="♗"
              title={tPractice('relatedArticles.bishopMovement.title')}
              description={tPractice('relatedArticles.bishopMovement.description')}
              locale={locale}
            />
          </div>
        </PracticePanel>
      </PracticeLayout>
    </PracticeResultPage>
  );
}
