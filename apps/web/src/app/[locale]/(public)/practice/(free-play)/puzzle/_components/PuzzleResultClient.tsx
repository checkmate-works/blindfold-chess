'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button, ChessBoard } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import { FaEye, FaPlay, FaRedo } from 'react-icons/fa';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { useMovePlayback } from '@/app/[locale]/(public)/practice/_hooks/use-move-playback';
import { SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { CircleMarker } from './CircleMarker';

/**
 * Interval between auto-advanced moves in the replay. Matches the value used
 * by `MoveSequenceMemorize` so the two surfaces feel consistent to a user
 * who uses both.
 */
const MOVE_INTERVAL_MS = 1000;
/**
 * Short delay before the first move starts animating after the user clicks
 * Play, so the initial position registers for a beat before the pieces move.
 * Mirrors `MoveSequenceMemorize`'s `autoPlayDelayMs` of 500 ms.
 */
const PLAY_INITIAL_DELAY_MS = 500;

type Attempt = { move: string; isCorrect: boolean };

type Props = {
  positionId: string;
  fen: string;
  solutionLines: string[];
  solutionMoveLists: PuzzleSolutionMove[][];
};

export function PuzzleResultClient({ positionId, fen, solutionLines, solutionMoveLists }: Props) {
  const t = useTranslations('practice.puzzle.result');
  // Pull Play / Replay labels from the shared `practice.common` namespace so
  // the puzzle replay surface stays in lockstep with `MoveSequenceMemorize`
  // without reaching into a feature-specific namespace to borrow strings.
  const tCommon = useTranslations('practice.common');
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

  // Drive the replay with the same `useMovePlayback` hook `MoveSequenceMemorize`
  // uses — it owns the chess.js state, the step timer, and the jump/pause
  // primitives. The hook re-initialises when its `initialFen` / `moves` change,
  // so solutionLine switches (after sessionStorage read) reset the replay to
  // an idle state automatically.
  const replayMoveSans = useMemo(() => lockedMoves.map((m) => m.san), [lockedMoves]);
  const {
    currentFen: replayFen,
    isPlaying,
    hasPlayed,
    lastMove,
    play,
  } = useMovePlayback({
    initialFen: fen,
    moves: replayMoveSans,
    intervalMs: MOVE_INTERVAL_MS,
    autoPlayDelayMs: PLAY_INITIAL_DELAY_MS,
  });

  const solutionFirstMove = lockedMoves[0]?.san ?? '';
  const firstTurn: 'w' | 'b' = isBlackToMove ? 'b' : 'w';

  return (
    <div className="space-y-6">
      {/* (A) Replay board — mirrors MoveSequenceMemorize's layout: plain
       *     ChessBoard + Play overlay while idle, Replay affordance once
       *     the sequence has been played through at least once.
       */}
      <SectionTitle>{t('replaySection')}</SectionTitle>
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <div className="relative">
            <ChessBoard
              fen={replayFen}
              flipped={isBlackToMove}
              showCoordinates={preferences.showCoordinates}
              boardTheme={preferences.boardTheme}
              lastMove={preferences.highlightLastMove ? lastMove : null}
            />

            {/* Play overlay — shown while idle and never while a replay is
             *  in-flight. After the replay finishes (`hasPlayed=true`) the
             *  overlay goes away and the Replay button below takes over.
             */}
            {!isPlaying && !hasPlayed && lockedMoves.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                <button
                  type="button"
                  onClick={play}
                  aria-label={tCommon('play')}
                  className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 transition-all hover:scale-110"
                >
                  <FaPlay className="w-12 h-12 ml-1" />
                </button>
              </div>
            )}
          </div>

          {hasPlayed && !isPlaying && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={play}
                aria-label={tCommon('replay')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <FaRedo className="w-3 h-3" />
                <span>{tCommon('replay')}</span>
              </button>
            </div>
          )}
        </div>
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
