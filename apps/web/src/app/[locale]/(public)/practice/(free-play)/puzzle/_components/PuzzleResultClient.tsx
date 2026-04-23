'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { executeMove, movesToUci } from '@blindfold-chess/features/chess-core';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import { FaEye } from 'react-icons/fa';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { CircleMarker } from './CircleMarker';

/**
 * Delay between auto-advanced moves in the multi-move replay. 1500 ms lines
 * up roughly with the internal `AnimatedChessBoard` animation so each move
 * has time to complete before the next one starts, without testing the
 * viewer's patience.
 */
const REPLAY_STEP_DELAY_MS = 1500;

type Attempt = { move: string; isCorrect: boolean };

type Props = {
  positionId: string;
  fen: string;
  solutionLines: string[];
  solutionMoveLists: PuzzleSolutionMove[][];
};

export function PuzzleResultClient({ positionId, fen, solutionLines, solutionMoveLists }: Props) {
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

  // Resolve the locked solution back to its server-side `{san, note}[]` shape
  // by matching the stored `solutionLine` string against each candidate's
  // joined SAN tokens. sessionStorage carries only the line string (to keep
  // the session → result handoff compact + backward-compatible), so the
  // per-move note metadata has to be looked up from the prop the page
  // passed in. If no list matches (schema drift, cache miss), fall back to
  // the first line with null notes — the chip list still renders.
  const lockedMoves = useMemo<PuzzleSolutionMove[]>(() => {
    if (!solutionLine) return [];
    const hit = solutionMoveLists.find((list) => list.map((m) => m.san).join(' ') === solutionLine);
    if (hit) return hit;
    return solutionLine
      .split(/\s+/)
      .filter(Boolean)
      .map((san) => ({ san, note: null }));
  }, [solutionLine, solutionMoveLists]);

  const solutionFirstMove = lockedMoves[0]?.san ?? '';

  // Pre-compute the FEN *before* each move in the locked sequence. Index N
  // is the FEN that `AnimatedChessBoard` should take as its `initialFen`
  // when we want it to animate `lockedMoves[N].san`. The array length
  // matches `lockedMoves.length`: slot 0 is the puzzle's starting FEN,
  // slot 1 is the FEN after move 0 has been applied, etc. If `executeMove`
  // ever returns null (schema drift, illegal stored move), we stop
  // extending the array — the replay just won't advance past that index.
  const replayFens = useMemo<string[]>(() => {
    const fens: string[] = [fen];
    let current = fen;
    for (const m of lockedMoves) {
      const result = executeMove(current, m.san);
      if (!result) break;
      fens.push(result.fen);
      current = result.fen;
    }
    return fens;
  }, [fen, lockedMoves]);

  // Step through `lockedMoves` on a timer so `AnimatedChessBoard` re-keys
  // with a fresh (initialFen, move) pair on each tick and plays every move
  // in the sequence, not just the first. The board component itself only
  // animates a single move at a time, so we drive the sequence from here.
  const [replayIndex, setReplayIndex] = useState(0);

  // Restart from move 0 whenever the solution line changes (i.e. after
  // `useEffect` reads sessionStorage and swaps `solutionLine`).
  useEffect(() => {
    setReplayIndex(0);
  }, [lockedMoves]);

  useEffect(() => {
    if (replayIndex >= lockedMoves.length - 1) return;
    const handle = setTimeout(() => {
      setReplayIndex((i) => Math.min(i + 1, lockedMoves.length - 1));
    }, REPLAY_STEP_DELAY_MS);
    return () => clearTimeout(handle);
  }, [replayIndex, lockedMoves.length]);

  const replayInitialFen = replayFens[replayIndex] ?? fen;
  const replayMoveSan = lockedMoves[replayIndex]?.san;

  // Convert the current step's SAN to UCI for `AnimatedChessBoard`. The
  // board component accepts SAN too, but we keep the UCI conversion for
  // parity with the earlier single-move animation path.
  const replayMoveUci = useMemo(() => {
    if (!replayMoveSan) return undefined;
    const uciMoves = movesToUci([replayMoveSan], replayInitialFen);
    return uciMoves[0];
  }, [replayMoveSan, replayInitialFen]);

  const firstTurn: 'w' | 'b' = isBlackToMove ? 'b' : 'w';

  return (
    <div className="space-y-6">
      {/* (A) Replay board */}
      <SectionTitle>{t('replaySection')}</SectionTitle>
      <div className="max-w-md mx-auto">
        {/*
         * `key` forces AnimatedChessBoard to remount each step so its internal
         * `usePieceAnimation` hook picks up the new `(initialFen, move)` pair
         * cleanly instead of treating the change as a mid-animation update.
         */}
        <AnimatedChessBoard
          key={replayIndex}
          initialFen={replayInitialFen}
          move={replayMoveUci}
          autoPlay
          flipped={isBlackToMove}
          boardTheme={preferences.boardTheme}
        />
      </div>

      {lockedMoves.length > 0 && (
        <>
          {lockedMoves.length === 1 ? (
            <p className="text-center text-sm font-medium text-foreground">
              {t('solution', { move: solutionFirstMove })}
              {lockedMoves[0]!.note && (
                <span className="ml-1 text-muted-foreground font-normal">
                  {t('note', { note: lockedMoves[0]!.note })}
                </span>
              )}
            </p>
          ) : (
            <ol className="mx-auto max-w-md flex flex-col items-start gap-y-2 text-sm">
              {lockedMoves.map((m, i) => {
                const isWhiteMove = i % 2 === (firstTurn === 'w' ? 0 : 1);
                return (
                  <li key={i} className="flex items-baseline gap-1.5">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <CircleMarker color={isWhiteMove ? 'w' : 'b'} />
                    <span className="font-mono text-foreground">{m.san}</span>
                    {m.note && (
                      <span className="text-muted-foreground">{t('note', { note: m.note })}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}

      {/* (B) Attempt history — unordered list. Each bullet is one submitted
       *     move, which may or may not have been correct; we intentionally
       *     do NOT number the bullets because an incorrect attempt would
       *     shift the numbering out of step with the puzzle's actual move
       *     sequence and mislead the reader.
       */}
      {attempts.length > 0 && (
        <>
          <SectionTitle>{t('historySection')}</SectionTitle>
          <ul className="mx-auto max-w-md flex flex-col gap-1 text-sm list-disc list-inside">
            {attempts.map((attempt, index) => (
              <li key={index}>
                {attempt.isCorrect ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    &#x2705; {attempt.move}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 line-through">
                    &#x274C; {attempt.move}
                  </span>
                )}
              </li>
            ))}
          </ul>
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
