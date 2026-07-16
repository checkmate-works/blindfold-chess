'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/app/_components';
import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';
import { INLINE_BOARD_CARD_CHROME } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';

import type { KataStatus } from '../_lib/kata-status';

/** What the auto-play arrives at: the verdict against the chosen kata. */
export type KataVerdict = {
  status: KataStatus;
  /** Full-move number of the divergence; null for a clean in-book run. */
  moveNo: number | null;
  /** SAN actually played at the divergence. */
  played?: string;
  /** Prepared alternatives at the divergence, pre-joined for display. */
  expected?: string;
};

type Props = {
  /** Board position at each ply; index 0 is the start (server-precomputed). */
  positions: { fen: string; lastMove: { from: string; to: string } | null }[];
  /** Numbered move pairs for the horizontal move strip. */
  formatted: FormattedPgnMove[];
  side: 'white' | 'black';
  /**
   * The ply auto-play stops at: the divergence for deviation/gap, the end of
   * the matched book for in-book. The player can still step past it manually
   * (e.g. to see the off-book move actually played).
   */
  stopPly: number;
  verdict: KataVerdict;
};

const AUTOPLAY_MS = 700;

/**
 * Auto-replays the game against the chosen kata: the moves the game followed
 * on-book play themselves back, and the replay halts where the game left the
 * kata (or where the prepared line ran out), revealing the verdict. Manual
 * navigation (move strip / controls / arrow keys) pauses auto-play; Replay
 * restarts it. Same board chrome as the repertoire line viewer.
 */
export function KataReplayViewer({ positions, formatted, side, stopPly, verdict }: Props) {
  const t = useTranslations('play');
  const maxPly = positions.length - 1;
  const target = Math.max(0, Math.min(stopPly, maxPly));

  const [ply, setPly] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(target > 0);
  const [revealed, setRevealed] = useState(target === 0);

  useEffect(() => {
    if (!autoPlaying) return;
    const timer = setInterval(() => {
      setPly((p) => (p < target ? p + 1 : p));
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [autoPlaying, target]);

  useEffect(() => {
    if (ply >= target) {
      setAutoPlaying(false);
      setRevealed(true);
    }
  }, [ply, target]);

  const clampedPly = Math.min(ply, maxPly);
  const current = positions[clampedPly];
  const lastMove = clampedPly > 0 ? current.lastMove : null;

  const goTo = (p: number) => {
    setAutoPlaying(false);
    setPly(Math.max(0, Math.min(maxPly, p)));
  };

  const replay = () => {
    setPly(0);
    setRevealed(target === 0);
    setAutoPlaying(target > 0);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        goTo(clampedPly - 1);
      } else if (e.key === 'ArrowRight') {
        goTo(clampedPly + 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goTo is stable in effect terms; clampedPly/maxPly drive it
  }, [clampedPly, maxPly]);

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
                currentPosition={clampedPly - 1}
                onNavigateToPosition={(position) => goTo(position + 1)}
              />
            </div>
          )}

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

          <div
            className="relative flex items-center justify-center"
            style={{ aspectRatio: '8 / 1' }}
          >
            <MoveNavigationControls
              onNavigateToStart={() => goTo(0)}
              onNavigatePrevious={() => goTo(clampedPly - 1)}
              onNavigateNext={() => goTo(clampedPly + 1)}
              onNavigateToEnd={() => goTo(maxPly)}
              isPreviousDisabled={clampedPly === 0}
              isNextDisabled={clampedPly === maxPly}
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
          <Button variant="outline" onClick={replay}>
            {t('kataPage.replay')}
          </Button>
        </div>
      )}
    </div>
  );
}
