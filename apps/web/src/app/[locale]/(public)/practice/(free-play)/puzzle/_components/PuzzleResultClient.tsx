'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { movesToUci } from '@blindfold-chess/features/chess-core';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { BetaNotice, SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Attempt = { move: string; isCorrect: boolean };

type Props = {
  positionId: string;
  fen: string;
  solutionLines: string[];
};

export function PuzzleResultClient({ positionId, fen, solutionLines }: Props) {
  const t = useTranslations('practice.puzzle.result');
  const { preferences } = useGamePreferences();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [solutionLine, setSolutionLine] = useState<string>(solutionLines[0] ?? '');

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`puzzle_result_${positionId}`);
      if (stored) {
        const data = JSON.parse(stored) as {
          attempts: Attempt[];
          solutionLine: string;
        };
        setAttempts(data.attempts);
        if (data.solutionLine) {
          setSolutionLine(data.solutionLine);
        }
      }
    } catch {
      // sessionStorage may be unavailable or data malformed
    }
  }, [positionId]);

  const isBlackToMove = isBlackToMoveFromFen(fen);

  // Get the first move of the solution in SAN
  const solutionFirstMove = solutionLine.split(' ')[0] ?? '';

  // Convert SAN to UCI for AnimatedChessBoard
  const solutionMoveUci = useMemo(() => {
    if (!solutionFirstMove) return undefined;
    const uciMoves = movesToUci([solutionFirstMove], fen);
    return uciMoves[0];
  }, [solutionFirstMove, fen]);

  return (
    <div className="space-y-6">
      {/* (A) Replay board */}
      <SectionTitle>{t('replaySection')}</SectionTitle>
      <BetaNotice className="mb-4">
        <p>{t('betaNotice')}</p>
      </BetaNotice>
      <div className="max-w-md mx-auto">
        <AnimatedChessBoard
          initialFen={fen}
          move={solutionMoveUci}
          flipped={isBlackToMove}
          boardTheme={preferences.boardTheme}
        />
      </div>
      <p className="text-center text-sm font-medium text-foreground">
        {t('solution', { move: solutionFirstMove })}
      </p>

      {/* (B) Attempt history */}
      {attempts.length > 0 && (
        <>
          <SectionTitle>{t('historySection')}</SectionTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {attempts.map((attempt, index) => (
              <span key={index} className="flex items-center gap-1">
                {index > 0 && <span className="text-muted-foreground mx-1">&rarr;</span>}
                <span className="text-muted-foreground">{index + 1}.</span>
                {attempt.isCorrect ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    &#x2705; {attempt.move}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 line-through">
                    &#x274C; {attempt.move}
                  </span>
                )}
              </span>
            ))}
          </div>
        </>
      )}

      {/* (D) Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Link
          href="/practice/puzzle"
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90 transition-opacity text-center"
        >
          {t('backToList')}
        </Link>
        <Link
          href={`/practice/puzzle/${positionId}`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity text-center"
        >
          {t('tryAgain')}
        </Link>
      </div>
    </div>
  );
}
