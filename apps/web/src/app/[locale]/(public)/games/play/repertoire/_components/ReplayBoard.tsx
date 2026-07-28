'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import { FaPlay } from 'react-icons/fa';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationRow } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationRow';
import { INLINE_BOARD_CARD_CHROME } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';
import { useBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';

import { useReplayPlayback } from '../_hooks/use-replay-playback';
import type { MatchVerdict } from '../_lib/build-replay';

type Props = {
  /** Board position at each ply; index 0 is the start (server-precomputed). */
  positions: { fen: string; lastMove: { from: string; to: string } | null }[];
  /** Numbered move pairs for the horizontal move strip. */
  formatted: FormattedPgnMove[];
  side: 'white' | 'black';
  /**
   * The ply playback stops at: the divergence for deviation/gap, the end of
   * the matched book for in-book. The player can still step past it manually
   * (e.g. to see the off-book move actually played).
   */
  stopPly: number;
  verdict: MatchVerdict;
  /**
   * Where "Add this line to your kata" navigates (the add-line form, preloaded
   * with the uncovered line) — set exactly when the game left the kata. The
   * verdict panel then offers saving the line instead of a replay: capturing
   * the gap is the action that matters there.
   */
  addLineHref?: string | null;
};

/**
 * Replays the game against the chosen kata behind an overlay Play button (the
 * PuzzleSolutionReplay pattern): the moves the game followed on-book play
 * themselves back, and the playback halts where the game left the kata (or
 * where the prepared line ran out), revealing the verdict. Manual navigation
 * (move strip / controls / arrow keys) pauses playback and dismisses the
 * overlay; the verdict panel's Replay restarts it. Same board chrome as the
 * repertoire line viewer. Playback timing/state lives in useReplayPlayback.
 */
export function ReplayBoard({
  positions,
  formatted,
  side,
  stopPly,
  verdict,
  addLineHref = null,
}: Props) {
  const t = useTranslations('play');
  const maxPly = positions.length - 1;
  const { ply, revealed, showOverlay, goTo, play } = useReplayPlayback({ maxPly, stopPly });

  const current = positions[ply];
  const lastMove = ply > 0 ? current.lastMove : null;
  const display = useBoardDisplay(lastMove);

  const detail =
    verdict.status === 'in-book'
      ? t('repertoireCheck.inBookDetail')
      : t(
          verdict.status === 'deviation'
            ? 'repertoireCheck.deviationDetail'
            : 'repertoireCheck.gapDetail',
          {
            moveNo: verdict.moveNo ?? 0,
            played: verdict.played ?? '',
            expected: verdict.expected ?? '',
          }
        );

  return (
    <div className="space-y-4">
      <div className={INLINE_BOARD_CARD_CHROME}>
        <div className="relative">
          <HorizontalMoveList
            formattedPgn={formatted}
            currentPosition={ply - 1}
            onNavigateToPosition={(position) => goTo(position + 1)}
          />

          <div className="relative">
            <ChessBoard
              fen={current.fen}
              flipped={side === 'black'}
              playerSide={side}
              showOwnPieces
              showOpponentPieces
              {...display}
              rounded={false}
            />

            {showOverlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <button
                  type="button"
                  onClick={play}
                  aria-label={t('repertoireCheck.play')}
                  className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 transition-all hover:scale-110"
                >
                  <FaPlay className="w-12 h-12 ml-1" />
                </button>
              </div>
            )}
          </div>

          <MoveNavigationRow
            onNavigateToStart={() => goTo(0)}
            onNavigatePrevious={() => goTo(ply - 1)}
            onNavigateNext={() => goTo(ply + 1)}
            onNavigateToEnd={() => goTo(maxPly)}
            isPreviousDisabled={ply === 0}
            isNextDisabled={ply === maxPly}
          />
        </div>
      </div>

      {revealed && (
        <div
          className="space-y-3 rounded-xl border border-border bg-card p-4"
          data-testid="repertoire-check-verdict"
        >
          <p className="text-sm text-foreground">{detail}</p>
          {addLineHref ? (
            <Link href={addLineHref} className="block">
              <Button asChild variant="primary" fullWidth>
                {t('repertoireCheck.addLine.cta')}
              </Button>
            </Link>
          ) : (
            <Button variant="outline" onClick={play}>
              {t('repertoireCheck.replay')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
