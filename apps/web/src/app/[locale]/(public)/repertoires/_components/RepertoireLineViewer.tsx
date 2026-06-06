'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ChessBoard } from '@/app/_components/chess/ChessBoard';
import type { FormattedPgnMove } from '@blindfold-chess/features/chess-core';
import type { Side } from '@blindfold-chess/types';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';
import { INLINE_BOARD_CARD_CHROME } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';

/** One line, pre-replayed + pre-formatted on the server (no chess.js client-side). */
export type RepertoireViewerLine = {
  id: string;
  name: string | null;
  /** Numbered move pairs, rendered like the in-game move list. */
  formatted: FormattedPgnMove[];
  /** Board position at each ply; index 0 is the start. */
  positions: { fen: string; lastMove: { from: string; to: string } | null }[];
};

type Props = {
  lines: RepertoireViewerLine[];
  side: Side;
};

/**
 * Interactive viewer for a repertoire's lines: a clickable list of lines on the
 * left, and on the right the same board layout the game screen uses — a
 * horizontally-scrolling move list above the board, the board, and first / prev
 * / next / last controls (and ←/→ keys). Positions/formatting are precomputed
 * server-side, so this stays a thin UI client component.
 */
export function RepertoireLineViewer({ lines, side }: Props) {
  const t = useTranslations('Repertoires');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [ply, setPly] = useState(0);

  const line = lines[selectedIndex] ?? lines[0];
  const maxPly = line.positions.length - 1;
  const clampedPly = Math.min(ply, maxPly);
  const current = line.positions[clampedPly];
  const lastMove = clampedPly > 0 ? current.lastMove : null;

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

  function selectLine(index: number) {
    setSelectedIndex(index);
    setPly(0);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,240px)_1fr]">
      <ul className="space-y-1">
        {lines.map((l, i) => {
          const isSelected = i === selectedIndex;
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => selectLine(i)}
                className={`w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-link-primary/10 font-medium text-link-primary'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {l.name ?? t('detail.lineFallback', { n: i + 1 })}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="min-w-0">
        {/* Mirrors InlineBoardView's always-open (board-visible) chrome: a single
            card holding the horizontal move strip, the board, and the controls. */}
        <div className={INLINE_BOARD_CARD_CHROME}>
          <div className="relative">
            {line.formatted.length > 0 && (
              <div className="overflow-x-auto px-2 py-1.5">
                <HorizontalMoveList
                  formattedPgn={line.formatted}
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
      </div>
    </div>
  );
}
