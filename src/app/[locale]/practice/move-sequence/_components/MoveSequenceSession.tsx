'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';

import type { Locale } from '@/app/[locale]/_lib/types';

import { parseMoveSequence } from '../_lib/pgn-parser';
import type { MoveSequenceData, MoveSequencePhase, MoveSequenceSessionResult } from '../_lib/types';
import { MoveSequenceMemorize } from './MoveSequenceMemorize';
import { MoveSequenceRecall } from './MoveSequenceRecall';
import { MoveSequenceResult } from './MoveSequenceResult';

type Props = {
  locale: Locale;
  fen: string | null;
  pgn: string | null;
  includeOpponentMoves: boolean;
  error: string | null;
};

export function MoveSequenceSession({ locale, fen, pgn, includeOpponentMoves, error }: Props) {
  const t = useTranslations('practice.moveSequence');
  const router = useRouter();

  const [phase, setPhase] = useState<Exclude<MoveSequencePhase, 'setup'>>('memorize');
  const [data, setData] = useState<MoveSequenceData | null>(null);
  const [result, setResult] = useState<MoveSequenceSessionResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(error);

  // Parse FEN and PGN on mount
  useEffect(() => {
    if (error) {
      setParseError(t(error as 'invalid_data' | 'invalid_fen'));
      return;
    }

    if (!fen || !pgn) {
      setParseError(t('fenRequired'));
      return;
    }

    const parseResult = parseMoveSequence(fen.trim(), pgn.trim());

    if (!parseResult.success) {
      setParseError(parseResult.error);
      return;
    }

    setData({
      ...parseResult.data,
      includeOpponentMoves,
    });
  }, [fen, pgn, includeOpponentMoves, error, t]);

  const handleMemorizeComplete = () => {
    setPhase('recall');
  };

  const handleRecallComplete = (sessionResult: MoveSequenceSessionResult) => {
    setResult(sessionResult);
    setPhase('result');
  };

  const handleTryAgain = () => {
    setResult(null);
    setPhase('memorize');
  };

  const handleBackToSetup = () => {
    router.push(`/${locale}/practice/move-sequence`);
  };

  // Show error state
  if (parseError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <p className="text-destructive mb-4">{parseError}</p>
          <Button onClick={handleBackToSetup} variant="secondary">
            {t('backToSetup')}
          </Button>
        </div>
      </div>
    );
  }

  // Show loading while parsing
  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  switch (phase) {
    case 'memorize':
      return <MoveSequenceMemorize data={data} onComplete={handleMemorizeComplete} />;

    case 'recall':
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
