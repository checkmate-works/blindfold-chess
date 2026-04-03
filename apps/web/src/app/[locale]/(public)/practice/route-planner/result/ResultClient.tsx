'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import type { LeaderboardRow } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { LeaderboardPreview } from '@/app/[locale]/(public)/practice/_components/LeaderboardPreview';
import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { SignUpBanner } from '@/app/[locale]/(public)/practice/_components/SignUpBanner';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  type RoutePlannerResult,
  RoutePlannerResultList,
} from '../_components/RoutePlannerResultList';

type Props = {
  locale: Locale;
  adBannerStandard?: React.ReactNode;
  leaderboardRows?: LeaderboardRow[];
  leaderboardDetailPath?: string;
};

export function ResultClient({
  locale,
  adBannerStandard,
  leaderboardRows,
  leaderboardDetailPath,
}: Props) {
  const t = useTranslations('practice.routePlanner');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preferences, isLoaded } = useGamePreferences();

  const dataParam = searchParams.get('data');
  const timeElapsed = parseInt(searchParams.get('time') || '0', 10);
  const piece = searchParams.get('piece');

  const { score, total, results } = useMemo(() => {
    if (!dataParam) {
      return { score: 0, total: 0, results: [] };
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      const results = Array.isArray(parsed) ? (parsed as RoutePlannerResult[]) : [];
      const score = results.filter((r) => r.success).length;
      return { score, total: results.length, results };
    } catch {
      return { score: 0, total: 0, results: [] };
    }
  }, [dataParam]);

  // Calculate average time per question
  const averageTime = total > 0 ? (timeElapsed / total).toFixed(1) : '0.0';

  // Try Again: 同じ設定でセッションを即座にやり直す
  const sessionParams = new URLSearchParams();
  if (piece) sessionParams.set('piece', piece);
  const tryAgainUrl = `/${locale}/practice/route-planner/challenge/session?${sessionParams.toString()}`;

  // Change Settings: セットアップ画面に遷移
  const changeSettingsUrl = `/${locale}/practice/route-planner`;

  const relatedLinks = [
    {
      href: '/learn/moves/bishop-movement',
      icon: '♝',
      title: tPractice('legalMoves.articles.bishop.title'),
      description: tPractice('legalMoves.articles.bishop.description'),
    },
    {
      href: '/learn/moves/knight-movement',
      icon: '♞',
      title: tPractice('legalMoves.articles.knight.title'),
      description: tPractice('legalMoves.articles.knight.description'),
    },
  ];

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/route-planner' },
        { label: tPractice('result') },
      ]}
      containerClassName="space-y-8"
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={() => (window.location.href = tryAgainUrl)}
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
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
        afterActions={<SignUpBanner locale={locale} />}
      >
        {results.length > 0 && isLoaded && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground mb-4">
              {tPractice('problemDetails')}
            </h3>
            <RoutePlannerResultList
              results={results}
              boardTheme={preferences.boardTheme}
              labels={{
                correct: t('correct'),
                badEnd: t('badEnd'),
                badMove: t('incorrect'),
                shortestPath: t('shortestPath'),
                yourPath: t('yourPath'),
                skipped: tPractice('skip'),
              }}
            />
          </div>
        )}
      </PracticeComplete>

      <div className="mt-8 space-y-3">
        <SectionTitle>{tPractice('relatedLearning')}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {relatedLinks.map((link) => (
            <CardLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              title={link.title}
              description={link.description}
              locale={locale}
            />
          ))}
        </div>
      </div>

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
