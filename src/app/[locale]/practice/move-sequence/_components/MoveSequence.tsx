'use client';

import { useState } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { MoveSequenceData, MoveSequencePhase, MoveSequenceSessionResult } from '../_lib/types';
import { MoveSequenceMemorize } from './MoveSequenceMemorize';
import { MoveSequenceRecall } from './MoveSequenceRecall';
import { MoveSequenceResult } from './MoveSequenceResult';
import { MoveSequenceSetup } from './MoveSequenceSetup';

type Props = {
  locale: Locale;
  urlFen: string | null;
  urlPgn: string | null;
  urlError: string | null;
};

export default function MoveSequence({ locale, urlFen, urlPgn, urlError }: Props) {
  const [phase, setPhase] = useState<MoveSequencePhase>('setup');
  const [data, setData] = useState<MoveSequenceData | null>(null);
  const [result, setResult] = useState<MoveSequenceSessionResult | null>(null);

  const handleStart = (sequenceData: MoveSequenceData) => {
    setData(sequenceData);
    setPhase('memorize');
  };

  const handleMemorizeComplete = () => {
    setPhase('recall');
  };

  const handleRecallComplete = (sessionResult: MoveSequenceSessionResult) => {
    setResult(sessionResult);
    setPhase('result');
  };

  const handleTryAgain = () => {
    // Reset to memorize phase with same data
    setResult(null);
    setPhase('memorize');
  };

  const handleBackToSetup = () => {
    setData(null);
    setResult(null);
    setPhase('setup');
  };

  switch (phase) {
    case 'setup':
      return (
        <MoveSequenceSetup
          locale={locale}
          urlFen={urlFen}
          urlPgn={urlPgn}
          urlError={urlError}
          onStart={handleStart}
        />
      );

    case 'memorize':
      if (!data) return null;
      return <MoveSequenceMemorize data={data} onComplete={handleMemorizeComplete} />;

    case 'recall':
      if (!data) return null;
      return <MoveSequenceRecall data={data} onComplete={handleRecallComplete} />;

    case 'result':
      if (!result) return null;
      return (
        <MoveSequenceResult
          result={result}
          onTryAgain={handleTryAgain}
          onBackToSetup={handleBackToSetup}
        />
      );

    default:
      return null;
  }
}
