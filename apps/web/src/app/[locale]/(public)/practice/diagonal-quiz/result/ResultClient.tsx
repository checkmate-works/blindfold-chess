'use client';

import { useMemo } from 'react';

import { useSearchParams } from 'next/navigation';

import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

import { DiagonalQuizProblemList } from '../_components/DiagonalQuizProblemList';
import type { QuestionResult } from '../_components/DiagonalQuizProblemList';

function DiagonalQuizChildren() {
  const searchParams = useSearchParams();
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

  return (
    <div className="mt-8">
      <DiagonalQuizProblemList results={questionResults} />
    </div>
  );
}

export const ResultClient = createPracticeResultClient({
  moduleSlug: 'diagonal-quiz',
  i18nKey: 'diagonalQuiz',
  containerClassName: 'space-y-8',
  buildTryAgainUrl: (ctx) => `/${ctx.locale}/practice/diagonal-quiz/challenge/session`,
  buildSettingsUrl: (ctx) => `/${ctx.locale}/practice/diagonal-quiz`,
  buildAverageTimeText: (ctx) => {
    const dataParam = ctx.searchParams.get('data');
    let count = 0;
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        count = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        // ignore
      }
    }
    const avg = count > 0 ? (ctx.timeElapsed / count).toFixed(1) : '0.0';
    return ctx.tPractice('secondsFormat', { seconds: avg });
  },
  renderChildren: () => <DiagonalQuizChildren />,
  extraCompleteProps: (_ctx, { adBannerWide }) => ({
    beforeRelatedContent: adBannerWide,
  }),
});
