'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { BoardFrame, ChessBoard } from '@/app/_components';
import type { ClientTranslator } from '@/i18n/translator';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import { fullmoveNumberFromFen } from '@blindfold-chess/features/chess-core/fen';
import type { PieceColor } from '@blindfold-chess/types';
import { FaPlay, FaRedo } from 'react-icons/fa';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { useMovePlayback } from '@/app/[locale]/(public)/practice/_hooks/use-move-playback';
import { SectionTitle } from '@/app/[locale]/_components';
import { useBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';

import { buildSolutionPairs } from '../_lib/solution-pairs';
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
  /**
   * Show the move-by-move breakdown below the board. Default: true. The
   * puzzle result screen sets this to `false` once attempts exist, since
   * `AttemptHistoryPanel` already renders the same moves (plus the user's
   * wrong attempts) in the same White/Black layout — this list only adds
   * value when there is no attempt history to show instead.
   */
  showMoveList?: boolean;
};

export function PuzzleSolutionReplay({
  fen,
  solutionMoves,
  showSectionTitle = true,
  showMoveList = true,
}: Props) {
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

  const isBlackToMove = isBlackToMoveFromFen(fen);
  const firstTurn: PieceColor = isBlackToMove ? 'b' : 'w';

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

  const display = useBoardDisplay(lastMove);

  const solutionFirstMove = solutionMoves[0]?.san ?? '';
  const solutionPairs = useMemo(
    () => buildSolutionPairs(solutionMoves, firstTurn, fullmoveNumberFromFen(fen)),
    [solutionMoves, firstTurn, fen]
  );

  return (
    <div className="space-y-6">
      {showSectionTitle && <SectionTitle>{t('replaySection')}</SectionTitle>}
      <BoardFrame>
        <div className="relative">
          <ChessBoard fen={replayFen} flipped={isBlackToMove} {...display} />

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
      </BoardFrame>

      {showMoveList && solutionMoves.length > 0 && (
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
            <div className="mx-auto max-w-md">
              <div className="flex items-center text-xs font-medium text-muted-foreground">
                <span className="w-10 shrink-0" />
                <span className="flex-1 px-2 flex items-center gap-1.5">
                  <CircleMarker color="w" />
                  {tCommon('white')}
                </span>
                <span className="flex-1 px-2 flex items-center gap-1.5">
                  <CircleMarker color="b" />
                  {tCommon('black')}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                {solutionPairs.map((pair) => (
                  <div key={pair.moveNumber} className="flex items-baseline">
                    <span className="w-10 shrink-0 text-right pr-2 text-muted-foreground">
                      {pair.moveNumber}.
                    </span>
                    <span className="flex-1 px-2">
                      <SolutionMoveCell move={pair.white} t={t} />
                    </span>
                    <span className="flex-1 px-2">
                      <SolutionMoveCell move={pair.black} t={t} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SolutionMoveCell({ move, t }: { move: PuzzleSolutionMove | null; t: ClientTranslator }) {
  if (!move) return <span className="text-muted-foreground">…</span>;
  return (
    <>
      <span className="font-mono text-foreground">{move.san}</span>
      {move.note && (
        <span className="ml-1 text-muted-foreground">{t('note', { note: move.note })}</span>
      )}
    </>
  );
}
