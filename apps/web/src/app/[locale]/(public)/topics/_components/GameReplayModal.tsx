'use client';

import { useMemo, useState } from 'react';

import {
  getFenAfterMoves,
  getStartingFen,
  parsePgnWithFen,
} from '@blindfold-chess/features/chess-core';

import { BoardReviewModal } from './BoardReviewModal';
import type { BoardReviewMovePair } from './BoardReviewModal';

/**
 * Modal wrapper that owns chess.js move-state for an attached PGN
 * game. Pairs `BoardReviewModal` (pure display) with the
 * `parsePgnWithFen` + `getFenAfterMoves` helpers from chess-core so
 * the modal can step through every position in the PGN.
 *
 * @design Bundle split (SPEC1 §5-1)
 *
 * `AttachedGameCard` only imports this module via `next/dynamic({
 * ssr: false })`, so the chess.js dependency stays out of the chunk
 * page's first-paint client bundle. The summary card renders the
 * static thumbnail without ever touching this file; opening the
 * board review modal is what triggers the lazy load.
 *
 * @design Why a separate file from BoardReviewModal
 *
 * `BoardReviewModal` is shared with `AttachedFenCard`, which only
 * needs to enlarge a static FEN and never imports chess.js. Putting
 * the move-state logic in a sibling wrapper lets the FEN card import
 * `BoardReviewModal` directly (no dynamic import, no chess.js
 * payload) while the PGN card pays the chess.js cost only on demand.
 */
type Props = {
  pgn: string;
  /** Pre-computed final-position FEN (server-supplied), used as a
   * shortcut for the last move's FEN so the modal does not need to
   * replay every move when the user opens straight to "end". */
  fallbackFen: string;
  isOpen: boolean;
  onClose: () => void;
};

export function GameReplayModal({ pgn, fallbackFen, isOpen, onClose }: Props) {
  const parsed = useMemo(() => {
    try {
      return parsePgnWithFen(pgn);
    } catch {
      // Defensive: validateAttachedPgn already accepted this PGN at
      // write time, so a parse failure here means the row is corrupt
      // or chess.js changed behavior. Fall back to no-moves rather
      // than crashing the modal.
      return { moves: [] as string[], startingFen: undefined };
    }
  }, [pgn]);

  const startingFen = parsed.startingFen ?? getStartingFen();
  const totalMoves = parsed.moves.length;

  // Move index: -1 = before any move; 0..totalMoves-1 = after that move.
  // Open the modal at the final position so the user sees the same
  // board the summary card showed in the thumbnail.
  const [moveIndex, setMoveIndex] = useState<number>(totalMoves > 0 ? totalMoves - 1 : -1);
  const [flipped, setFlipped] = useState(false);

  const currentFen = useMemo(() => {
    if (moveIndex === -1) return startingFen;
    if (moveIndex === totalMoves - 1) return fallbackFen;
    return getFenAfterMoves(startingFen, parsed.moves.slice(0, moveIndex + 1));
  }, [moveIndex, parsed.moves, startingFen, fallbackFen, totalMoves]);

  const movePairs = useMemo<BoardReviewMovePair[]>(() => {
    const pairs: BoardReviewMovePair[] = [];
    for (let i = 0; i < parsed.moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        whiteMove: parsed.moves[i],
        whiteIndex: i,
        blackMove: parsed.moves[i + 1],
        blackIndex: i + 1 < parsed.moves.length ? i + 1 : undefined,
      });
    }
    return pairs;
  }, [parsed.moves]);

  const showNavigation = totalMoves > 0;

  return (
    <BoardReviewModal
      isOpen={isOpen}
      onClose={onClose}
      fen={currentFen}
      flipped={flipped}
      onFlip={() => setFlipped((f) => !f)}
      movePairs={showNavigation ? movePairs : undefined}
      currentMoveIndex={showNavigation ? moveIndex : undefined}
      totalMoves={showNavigation ? totalMoves : undefined}
      onNavigateToStart={showNavigation ? () => setMoveIndex(-1) : undefined}
      onNavigatePrevious={
        showNavigation ? () => setMoveIndex((i) => Math.max(-1, i - 1)) : undefined
      }
      onNavigateNext={
        showNavigation ? () => setMoveIndex((i) => Math.min(totalMoves - 1, i + 1)) : undefined
      }
      onNavigateToEnd={showNavigation ? () => setMoveIndex(totalMoves - 1) : undefined}
      onNavigateToIndex={showNavigation ? (i) => setMoveIndex(i) : undefined}
    />
  );
}
