'use client';

import { useCallback, useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { ProblemResultList } from '@/app/[locale]/(public)/practice/_components/ProblemResultList';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_components/get-common-practice-labels';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function ResultClient({ locale }: Props) {
  const t = useTranslations('practice.positionMemory');
  const tPractice = useTranslations('practice');
  const tNavigation = useTranslations('navigation'); // Added for breadcrumbs label
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = parseInt(searchParams.get('score') || '0', 10);
  const total = parseInt(searchParams.get('total') || '100', 10);
  const dataParam = searchParams.get('data');
  const statsParam = searchParams.get('stats');
  const isCustomFen = searchParams.get('custom') === 'true';

  const problemResults = useMemo(() => {
    if (!dataParam) return [];
    try {
      // Decode and parse minified JSON
      // f=fen, r=recreatedFen, b=isBlackToMove, a=accuracy, c=correctPieces
      // t=totalPieces, i=incorrectPieces, m=missingPieces, e=extraPieces
      // o=originalIndex, s=skipped
      interface ResultItem {
        f: string;
        r: string;
        b: number; // 0 or 1
        a: number;
        c: number;
        t: number;
        i: number;
        m: number;
        e: number;
        o: number;
        s: number; // 0 or 1
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

  const detailedStats = useMemo(() => {
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
    } catch (e) {
      console.error('Failed to parse stats data', e);
      return undefined;
    }
  }, [statsParam]);

  const timeLimit = searchParams.get('timeLimit');
  const shuffle = searchParams.get('shuffle');
  const count = searchParams.get('count');
  const problems = searchParams.get('problems');
  const source = searchParams.get('source');
  const mode = searchParams.get('mode');

  // Construct retry URL
  const retryParams = new URLSearchParams();
  if (timeLimit) retryParams.set('timeLimit', timeLimit);
  if (shuffle) retryParams.set('shuffle', shuffle);
  if (count) retryParams.set('count', count);
  if (problems) retryParams.set('problems', problems);
  if (source) retryParams.set('source', source);
  if (mode) retryParams.set('mode', mode);

  const retryUrl = `/${locale}/practice/position-memory/session?${retryParams.toString()}#position-memory-session`;

  const labels = {
    ...getCommonPracticeCompleteLabels(tPractice),
    score: `${t('accuracy')}: ${score.toFixed(1)}% (${detailedStats?.correctPieces ?? 0}/${detailedStats?.totalPieces ?? 0})`,
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
            router.refresh(); // Refresh to reflect changes if needed (though result uses passed data)
          }
        }
      } catch (error) {
        console.error('Failed to delete FEN from localStorage:', error);
      }
    },
    [router]
  );

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tNavigation('practice'), href: '/practice' },
        { label: t('title'), href: '/practice/position-memory' },
        { label: tPractice('result') },
      ]}
      containerClassName="space-y-8"
      dividerClassName="my-8"
    >
      <PracticeComplete
        score={score}
        total={total}
        // Full page reload to reset session state in PositionMemorySession (dynamically imported)
        onTryAgain={() => (window.location.href = retryUrl)}
        onExit={() => router.push(`/${locale}/practice/position-memory`)}
        locale={locale}
        labels={labels}
        scoreStats={detailedStats}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      >
        <ProblemResultList
          problemResults={problemResults}
          labels={labels}
          isCustomFen={isCustomFen}
          onDeleteFen={handleDeleteFen}
        />
      </PracticeComplete>
    </PracticeResultPage>
  );
}
