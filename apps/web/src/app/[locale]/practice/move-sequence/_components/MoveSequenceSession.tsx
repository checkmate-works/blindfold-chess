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

// import { MoveSequenceResult } from './MoveSequenceResult'; // Logic moved to page

type Props = {
  locale: Locale;
  fen: string | null;
  pgn: string | null;
  includeOpponentMoves: boolean;
  skipMemorize?: boolean;
  isTutorial?: boolean;
  error: string | null;
};

export function MoveSequenceSession({
  locale,
  fen,
  pgn,
  includeOpponentMoves,
  skipMemorize = false,
  isTutorial = false,
  error,
}: Props) {
  const t = useTranslations('practice.moveSequence');
  const router = useRouter();

  const [phase, setPhase] = useState<Exclude<MoveSequencePhase, 'setup'>>(
    skipMemorize ? 'recall' : 'memorize'
  );
  const [data, setData] = useState<MoveSequenceData | null>(null);
  const [result, setResult] = useState<MoveSequenceSessionResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(error);

  // Scroll to session element after mount
  useEffect(() => {
    if (!data) return;

    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById('move-sequence-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [data]);

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
    router.push(`/${locale}/practice/move-sequence`);
  };

  const handleQuit = (sessionResult: MoveSequenceSessionResult) => {
    setResult(sessionResult);
    setPhase('result');
  };

  // Handle Result Redirection
  useEffect(() => {
    if (phase === 'result' && result) {
      const settings = {
        fen,
        pgn,
        includeOpponentMoves,
        skipMemorize,
      };

      const params = new URLSearchParams();
      params.set('data', JSON.stringify(result));
      params.set('settings', JSON.stringify(settings));
      if (isTutorial) {
        params.set('mode', 'tutorial');
      }

      router.push(`/${locale}/practice/move-sequence/result?${params.toString()}`);
    }
  }, [phase, result, fen, pgn, includeOpponentMoves, skipMemorize, isTutorial, locale, router]);

  // Show error state
  if (parseError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <p className="text-destructive mb-4">{parseError}</p>
          <Button onClick={handleTryAgain} variant="secondary">
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

  return (
    <div id="move-sequence-session">
      {(() => {
        switch (phase) {
          case 'memorize':
            return <MoveSequenceMemorize data={data} onComplete={handleMemorizeComplete} />;

          case 'recall':
            return (
              <MoveSequenceRecall
                data={data}
                onComplete={handleRecallComplete}
                onQuit={handleQuit}
              />
            );

          case 'result':
            return null;

          default:
            return null;
        }
      })()}
    </div>
  );
}
