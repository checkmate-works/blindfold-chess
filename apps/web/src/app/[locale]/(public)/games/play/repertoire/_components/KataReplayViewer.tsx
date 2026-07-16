'use client';

import { Button } from '@/app/_components';
import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import { FaPlay } from 'react-icons/fa';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';
import { INLINE_BOARD_CARD_CHROME } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';

import { useKataPlayback } from '../_hooks/use-kata-playback';
import type { KataVerdict } from '../_lib/build-replay';

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
  verdict: KataVerdict;
};

/**
 * Replays the game against the chosen kata behind an overlay Play button (the
 * PuzzleSolutionReplay pattern): the moves the game followed on-book play
 * themselves back, and the playback halts where the game left the kata (or
 * where the prepared line ran out), revealing the verdict. Manual navigation
 * (move strip / controls / arrow keys) pauses playback and dismisses the
 * overlay; the verdict panel's Replay restarts it. Same board chrome as the
 * repertoire line viewer. Playback timing/state lives in useKataPlayback.
 */
export function KataReplayViewer({ positions, formatted, side, stopPly, verdict }: Props) {
  const t = useTranslations('play');
  const maxPly = positions.length - 1;
  const { ply, revealed, showOverlay, goTo, play } = useKataPlayback({ maxPly, stopPly });

  const current = positions[ply];
  const lastMove = ply > 0 ? current.lastMove : null;

  const detail =
    verdict.status === 'in-book'
      ? t('kataPage.inBookDetail')
      : t(verdict.status === 'deviation' ? 'kataPage.deviationDetail' : 'kataPage.gapDetail', {
          moveNo: verdict.moveNo ?? 0,
          played: verdict.played ?? '',
          expected: verdict.expected ?? '',
        });

  return (
    <div className="space-y-4">
      <div className={INLINE_BOARD_CARD_CHROME}>
        <div className="relative">
          {formatted.length > 0 && (
            <div className="overflow-x-auto px-2 py-1.5">
              <HorizontalMoveList
                formattedPgn={formatted}
                currentPosition={ply - 1}
                onNavigateToPosition={(position) => goTo(position + 1)}
              />
            </div>
          )}

          <div className="relative">
            <ChessBoard
              fen={current.fen}
              flipped={side === 'black'}
              playerSide={side}
              lastMove={lastMove}
              showCoordinates
              showOwnPieces
              showOpponentPieces
              boardTheme="lichess"
              rounded={false}
            />

            {showOverlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <button
                  type="button"
                  onClick={play}
                  aria-label={t('kataPage.play')}
                  className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 transition-all hover:scale-110"
                >
                  <FaPlay className="w-12 h-12 ml-1" />
                </button>
              </div>
            )}
          </div>

          <div
            className="relative flex items-center justify-center"
            style={{ aspectRatio: '8 / 1' }}
          >
            <MoveNavigationControls
              onNavigateToStart={() => goTo(0)}
              onNavigatePrevious={() => goTo(ply - 1)}
              onNavigateNext={() => goTo(ply + 1)}
              onNavigateToEnd={() => goTo(maxPly)}
              isPreviousDisabled={ply === 0}
              isNextDisabled={ply === maxPly}
            />
          </div>
        </div>
      </div>

      {revealed && (
        <div
          className="space-y-3 rounded-xl border border-border bg-card p-4"
          data-testid="kata-verdict"
        >
          <p className="text-sm text-foreground">{detail}</p>
          <Button variant="outline" onClick={play}>
            {t('kataPage.replay')}
          </Button>
        </div>
      )}
    </div>
  );
}
