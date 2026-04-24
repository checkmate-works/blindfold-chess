'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { ChessBoard } from '@/app/_components';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import { FaPlay, FaRedo } from 'react-icons/fa';

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

type Props = {
  fen: string;
  solutionMoves: PuzzleSolutionMove[];
  /** Show the "Solution Replay" SectionTitle above the board. Default: true. */
  showSectionTitle?: boolean;
};

export function PuzzleSolutionReplay({ fen, solutionMoves, showSectionTitle = true }: Props) {
  /**
   * Intentionally borrows from the `practice.puzzle.result` namespace rather
   * than living in `practice.common`. This component was extracted out of
   * `PuzzleResultClient` and still consumes `replaySection` / `solution` /
   * `note` unchanged from both callers (the result page and the new
   * preview page), so the strings stay co-located with the result surface
   * that originally owned them. Hoisting would force both callers to learn
   * a second namespace for a single-use-case component.
   */
  const t = useTranslations('practice.puzzle.result');
  const tCommon = useTranslations('practice.common');
  const { preferences } = useGamePreferences();

  const isBlackToMove = isBlackToMoveFromFen(fen);
  const firstTurn: 'w' | 'b' = isBlackToMove ? 'b' : 'w';

  const replayMoveSans = useMemo(() => solutionMoves.map((m) => m.san), [solutionMoves]);
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

  const solutionFirstMove = solutionMoves[0]?.san ?? '';

  return (
    <div className="space-y-6">
      {showSectionTitle && <SectionTitle>{t('replaySection')}</SectionTitle>}
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

            {!isPlaying && !hasPlayed && solutionMoves.length > 0 && (
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

      {solutionMoves.length > 0 && (
        <>
          {solutionMoves.length === 1 ? (
            <p className="text-center text-sm font-medium text-foreground">
              {t('solution', { move: solutionFirstMove })}
              {solutionMoves[0]!.note && (
                <span className="ml-1 text-muted-foreground font-normal">
                  {t('note', { note: solutionMoves[0]!.note })}
                </span>
              )}
            </p>
          ) : (
            <ol className="mx-auto max-w-md flex flex-col items-start gap-y-2 text-sm">
              {solutionMoves.map((m, i) => {
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
    </div>
  );
}
