'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_components/get-common-practice-labels';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  type RoutePlannerResult,
  RoutePlannerResultList,
} from '../_components/RoutePlannerResultList';

type Props = {
  locale: Locale;
};

export function ResultClient({ locale }: Props) {
  const t = useTranslations('practice.routePlanner');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preferences } = useGamePreferences();

  const dataParam = searchParams.get('data');
  const modeParam = searchParams.get('mode');
  const isTutorial = modeParam === 'tutorial';

  const { score, total, results } = useMemo(() => {
    if (!dataParam) {
      return { score: 0, total: 0, results: [] };
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam));

      // ... (inside component)
      const results = Array.isArray(parsed) ? (parsed as RoutePlannerResult[]) : [];
      const score = results.filter((r) => r.success).length;
      return { score, total: results.length, results };
    } catch {
      return { score: 0, total: 0, results: [] };
    }
  }, [dataParam]);

  const handleTryAgain = () => {
    if (isTutorial) {
      router.push(`/${locale}/practice/route-planner?mode=tutorial`);
    } else {
      const count = searchParams.get('count');
      const pieces = searchParams.get('pieces');
      if (count && pieces) {
        router.push(`/${locale}/practice/route-planner/challenge?count=${count}&pieces=${pieces}`);
      } else {
        router.push(`/${locale}/practice/route-planner`);
      }
    }
  };

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
    {
      href: '/learn/moves/rook-movement',
      icon: '♜',
      title: tPractice('legalMoves.articles.rook.title'),
      description: tPractice('legalMoves.articles.rook.description'),
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
    >
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={handleTryAgain}
        onExit={() => router.push(`/${locale}/practice/route-planner`)}
        locale={locale}
        labels={{
          ...getCommonPracticeCompleteLabels(tPractice),
          ...(isTutorial
            ? {
                practiceComplete: t('tutorial.complete'),
                tryAgain: t('tutorial.restart'),
                morePractice: t('tutorial.finish'),
              }
            : { morePractice: tPractice('morePractice') }),
        }}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      >
        {results.length > 0 && (
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
                skipped: t('skip'),
              }}
            />
          </div>
        )}
      </PracticeComplete>

      {!isTutorial && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 mt-8 space-y-3">
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
        </div>
      )}
    </PracticeResultPage>
  );
}
