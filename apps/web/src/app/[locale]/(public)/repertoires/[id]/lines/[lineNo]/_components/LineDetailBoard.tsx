'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import type { Side } from '@blindfold-chess/types';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';
import { INLINE_BOARD_CARD_CHROME } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';

import type { LineMove } from '../_lib/line-moves';
import { AnnotationPanel } from './AnnotationPanel';
import { LineMovesPanel } from './LineMovesPanel';

type Props = {
  side: Side;
  formatted: FormattedPgnMove[];
  /** Board position at each ply; index 0 is the start, index k is after move k. */
  positions: { fen: string; lastMove: { from: string; to: string } | null }[];
  /** Per-ply move data, indexed by ply-1 (moves[0] = ply 1). */
  moves: LineMove[];
  isOwner: boolean;
  repertoireId: string;
  lineNo: number;
  locale: string;
  /** 1-based ply to focus initially (deep-link / default). */
  initialPly: number;
};

/**
 * A single line rendered with the in-game board layout: on desktop the board
 * sits in a 2/3 column with the collapsible "Moves" panel in a 1/3 column on
 * the right (stacking on mobile) — the same grid the game / replay screens use.
 * The board is always visible (first/prev/next/last controls + ←/→ keys). The
 * owner-authored annotation for the move in focus sits under the board; the
 * focused ply drives which move's note is shown and navigating swaps it.
 */
export function LineDetailBoard({
  side,
  formatted,
  positions,
  moves,
  isOwner,
  repertoireId,
  lineNo,
  locale,
  initialPly,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const moveParam = searchParams.get('move');

  const maxPly = positions.length - 1;
  const [ply, setPly] = useState(Math.min(Math.max(initialPly, 0), maxPly));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        setPly((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        setPly((p) => Math.min(maxPly, p + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maxPly]);

  const clampedPly = Math.min(ply, maxPly);

  // Mirror the focused move into ?move= (debounced) so the server-rendered
  // comment thread below follows the board. The board itself stays client-
  // instant; only the URL / comments catch up. `move` is clamped to >= 1 (the
  // first real move) since the start position has no move to discuss.
  const syncPly = Math.max(clampedPly, 1);
  useEffect(() => {
    if (String(syncPly) === moveParam) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      params.set('move', String(syncPly));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(timer);
  }, [syncPly, moveParam, pathname, router, searchParams]);
  const current = positions[clampedPly];
  const lastMove = clampedPly > 0 ? current.lastMove : null;
  const focusedMove = clampedPly > 0 ? moves[clampedPly - 1] : null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className={INLINE_BOARD_CARD_CHROME}>
          <div className="relative">
            {formatted.length > 0 && (
              <div className="overflow-x-auto px-2 py-1.5">
                <HorizontalMoveList
                  formattedPgn={formatted}
                  currentPosition={clampedPly - 1}
                  onNavigateToPosition={(position) => setPly(position + 1)}
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
                onNavigateToStart={() => setPly(0)}
                onNavigatePrevious={() => setPly(Math.max(0, clampedPly - 1))}
                onNavigateNext={() => setPly(Math.min(maxPly, clampedPly + 1))}
                onNavigateToEnd={() => setPly(maxPly)}
                isPreviousDisabled={clampedPly === 0}
                isNextDisabled={clampedPly === maxPly}
              />
            </div>
          </div>
        </div>

        {focusedMove && (
          <AnnotationPanel
            key={focusedMove.positionKey}
            repertoireId={repertoireId}
            lineNo={lineNo}
            locale={locale}
            positionKey={focusedMove.positionKey}
            moveLabel={focusedMove.label}
            initialText={focusedMove.annotation}
            isOwner={isOwner}
          />
        )}
      </div>

      <div className="lg:col-span-1">
        <LineMovesPanel
          formatted={formatted}
          currentPosition={clampedPly - 1}
          onNavigateToPosition={(index) => setPly(index + 1)}
        />
      </div>
    </div>
  );
}
