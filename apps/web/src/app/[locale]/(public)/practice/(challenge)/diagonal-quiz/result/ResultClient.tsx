'use client';

import { useMemo } from 'react';

import { useSearchParams } from 'next/navigation';

import { createPracticeResultClient } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultClient';

import { DiagonalQuizProblemList } from '../_components/DiagonalQuizProblemList';
import { parseDiagonalQuizResults } from '../_lib/result-data';

function DiagonalQuizChildren() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');

  const questionResults = useMemo(() => parseDiagonalQuizResults(dataParam), [dataParam]);

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
    // The timed-out question took no answer, so it is not in the average.
    const count = parseDiagonalQuizResults(ctx.searchParams.get('data')).filter(
      (result) => !result.timedOut
    ).length;
    const avg = count > 0 ? (ctx.timeElapsed / count).toFixed(1) : '0.0';
    return ctx.tPractice('secondsFormat', { seconds: avg });
  },
  renderChildren: () => <DiagonalQuizChildren />,
});
