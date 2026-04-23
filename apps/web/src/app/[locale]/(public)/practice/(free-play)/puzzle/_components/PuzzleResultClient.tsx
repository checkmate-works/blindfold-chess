'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { movesToUci } from '@blindfold-chess/features/chess-core';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import { FaEye } from 'react-icons/fa';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { SectionTitle } from '@/app/[locale]/_components';
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
  const [peekCount, setPeekCount] = useState(0);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`puzzle_result_${positionId}`);
      if (stored) {
        const data = JSON.parse(stored) as {
          attempts: Attempt[];
          solutionLine: string;
          peekCount?: number;
        };
        setAttempts(data.attempts);
        if (data.solutionLine) {
          setSolutionLine(data.solutionLine);
        }
        if (typeof data.peekCount === 'number') {
          setPeekCount(data.peekCount);
        }
      }
    } catch {
      // sessionStorage may be unavailable or data malformed
    }
  }, [positionId]);

  const isBlackToMove = isBlackToMoveFromFen(fen);
  const solutionMoves = useMemo(() => solutionLine.split(/\s+/).filter(Boolean), [solutionLine]);
  const solutionFirstMove = solutionMoves[0] ?? '';

  // Convert SAN to UCI for AnimatedChessBoard. We animate just the first move
  // as a visual anchor; the full line is listed as chips below for readers
  // who want the whole solution.
  const solutionMoveUci = useMemo(() => {
    if (!solutionFirstMove) return undefined;
    const uciMoves = movesToUci([solutionFirstMove], fen);
    return uciMoves[0];
  }, [solutionFirstMove, fen]);

  const firstTurn: 'w' | 'b' = isBlackToMove ? 'b' : 'w';

  return (
    <div className="space-y-6">
      {/* (A) Replay board */}
      <SectionTitle>{t('replaySection')}</SectionTitle>
      <div className="max-w-md mx-auto">
        <AnimatedChessBoard
          initialFen={fen}
          move={solutionMoveUci}
          flipped={isBlackToMove}
          boardTheme={preferences.boardTheme}
        />
      </div>

      {solutionMoves.length > 0 && (
        <>
          {solutionMoves.length === 1 ? (
            <p className="text-center text-sm font-medium text-foreground">
              {t('solution', { move: solutionFirstMove })}
            </p>
          ) : (
            <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
              {solutionMoves.map((move, i) => {
                const isWhiteMove = i % 2 === (firstTurn === 'w' ? 0 : 1);
                return (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span aria-hidden className="text-base leading-none">
                      {isWhiteMove ? '⚪' : '⚫'}
                    </span>
                    <span className="font-mono text-foreground">{move}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}

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

      {/* (C) Peek count */}
      {peekCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FaEye className="w-4 h-4" />
          <span>{t('peekCount', { count: peekCount })}</span>
        </div>
      )}

      {/* (D) Action buttons */}
      <div className="flex flex-col gap-3 pt-4">
        <Link href={`/practice/puzzle/${positionId}`}>
          <Button asChild variant="primary" fullWidth>
            {t('tryAgain')}
          </Button>
        </Link>
        <Link href="/practice/puzzle">
          <Button asChild variant="secondary" fullWidth>
            {t('backToList')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
