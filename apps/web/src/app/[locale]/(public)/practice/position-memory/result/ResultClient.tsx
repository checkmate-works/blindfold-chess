'use client';

import { useCallback, useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ProblemResultList } from '@/app/[locale]/(public)/practice/_components/ProblemResultList';
import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
import type { PracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/practice-complete-types';

function PositionMemoryChildren() {
  const searchParams = useSearchParams();
  const t = useTranslations('practice.positionMemory');
  const tPractice = useTranslations('practice') as unknown as (key: string) => string;
  const router = useRouter();

  const dataParam = searchParams.get('data');
  const isCustomFen = searchParams.get('custom') === 'true';

  const problemResults = useMemo(() => {
    if (!dataParam) return [];
    try {
      interface ResultItem {
        f: string;
        r: string;
        b: number;
        a: number;
        c: number;
        t: number;
        i: number;
        m: number;
        e: number;
        o: number;
        s: number;
      }
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      return parsed.map((item: ResultItem) => ({
        fen: item.f,
        recreatedFen: item.r,
        isBlackToMove: item.b === 1,
        accuracy: item.a,
        correctPieces: item.c,
        totalPieces: item.t,
        incorrectPieces: item.i,
        missingPieces: item.m,
        extraPieces: item.e,
        originalIndex: item.o,
        skipped: item.s === 1,
      }));
    } catch (e) {
      console.error('Failed to parse result data', e);
      return [];
    }
  }, [dataParam]);

  const labels: PracticeCompleteLabels = {
    ...getCommonPracticeCompleteLabels(tPractice),
    recreationProgress: t('recreationProgress'),
    correct: t('correct'),
    incorrect: t('incorrect'),
    missing: t('missing'),
    extra: t('extra'),
    extraDescription: t('extraDescription'),
    problemDetails: t('problemDetails'),
    problem: t('problem'),
    original: t('original'),
    yourRecreation: t('yourRecreation'),
    deleteFenTitle: t('deleteFenTitle'),
    deleteFenMessage: t('deleteFenMessage'),
    deleteFenConfirm: t('deleteFenConfirm'),
    deleteFenCancel: t('deleteFenCancel'),
    skipped: t('skipped'),
    analyzeOnLichess: t('analyzeOnLichess'),
  };

  const handleDeleteFen = useCallback(
    (fenToDelete: string) => {
      try {
        const savedSettings = localStorage.getItem('positionMemorySettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.customFenInput) {
            const fensFromStorage = settings.customFenInput
              .trim()
              .split('\n')
              .filter((line: string) => line.trim());
            const updatedFens = fensFromStorage.filter(
              (fen: string) => fen.trim() !== fenToDelete.trim()
            );
            settings.customFenInput = updatedFens.join('\n');
            localStorage.setItem('positionMemorySettings', JSON.stringify(settings));
            router.refresh();
          }
        }
      } catch (error) {
        console.error('Failed to delete FEN from localStorage:', error);
      }
    },
    [router]
  );

  return (
    <ProblemResultList
      problemResults={problemResults}
      labels={labels}
      isCustomFen={isCustomFen}
      onDeleteFen={handleDeleteFen}
    />
  );
}

function parseStats(searchParams: URLSearchParams) {
  const statsParam = searchParams.get('stats');
  if (!statsParam) return undefined;
  try {
    const parsed = JSON.parse(decodeURIComponent(statsParam));
    return {
      correctPieces: parsed.c,
      totalPieces: parsed.t,
      incorrectPieces: parsed.i,
      missingPieces: parsed.m,
      extraPieces: parsed.e,
    };
  } catch {
    return undefined;
  }
}

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'position-memory',
  i18nKey: 'positionMemory',
  containerClassName: 'space-y-8',
  dividerClassName: 'my-8',
  practiceBreadcrumbSource: 'navigation',
  tryAgainNavigation: 'reload',
  showSignUpBanner: false,
  resolveScoreTotal: (sp) => ({
    score: parseInt(sp.get('score') || '0', 10),
    total: parseInt(sp.get('total') || '100', 10),
  }),
  extraParams: (sp) => ({
    timeLimit: sp.get('timeLimit'),
    shuffle: sp.get('shuffle'),
    count: sp.get('count'),
    problems: sp.get('problems'),
    source: sp.get('source'),
    mode: sp.get('mode'),
  }),
  buildTryAgainUrl: (ctx, extra) => {
    const params = new URLSearchParams();
    if (extra.timeLimit) params.set('timeLimit', extra.timeLimit);
    if (extra.shuffle) params.set('shuffle', extra.shuffle);
    if (extra.count) params.set('count', extra.count);
    if (extra.problems) params.set('problems', extra.problems);
    if (extra.source) params.set('source', extra.source);
    if (extra.mode) params.set('mode', extra.mode);
    return `/${ctx.locale}/practice/position-memory/session?${params.toString()}#position-memory-session`;
  },
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/position-memory`,
  buildAverageTimeText: () => undefined,
  buildScoreStats: (ctx) => {
    const stats = parseStats(ctx.searchParams);
    return stats ?? { correct: ctx.score, incorrect: ctx.total - ctx.score, total: ctx.total };
  },
  labelOverrides: (ctx) => {
    const stats = parseStats(ctx.searchParams);
    return {
      score: `${ctx.t('accuracy')}: ${ctx.score.toFixed(1)}% (${stats?.correctPieces ?? 0}/${stats?.totalPieces ?? 0})`,
      recreationProgress: ctx.t('recreationProgress'),
      correct: ctx.t('correct'),
      incorrect: ctx.t('incorrect'),
      missing: ctx.t('missing'),
      extra: ctx.t('extra'),
      extraDescription: ctx.t('extraDescription'),
      problemDetails: ctx.t('problemDetails'),
      problem: ctx.t('problem'),
      original: ctx.t('original'),
      yourRecreation: ctx.t('yourRecreation'),
      deleteFenTitle: ctx.t('deleteFenTitle'),
      deleteFenMessage: ctx.t('deleteFenMessage'),
      deleteFenConfirm: ctx.t('deleteFenConfirm'),
      deleteFenCancel: ctx.t('deleteFenCancel'),
      skipped: ctx.t('skipped'),
      analyzeOnLichess: ctx.t('analyzeOnLichess'),
      averageTime: undefined,
    };
  },
  renderChildren: () => <PositionMemoryChildren />,
});
