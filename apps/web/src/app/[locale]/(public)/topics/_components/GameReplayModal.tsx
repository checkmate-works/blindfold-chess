'use client';

import { useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  formatMovesToPgn,
  getFenAfterMoves,
  getLastMoveDetails,
  getStartingFen,
  parsePgnWithFen,
} from '@blindfold-chess/features/chess-core';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';

import { BoardReviewModal } from './BoardReviewModal';

/**
 * Modal wrapper that owns chess.js move-state for an attached PGN
 * game. Pairs `BoardReviewModal` (pure display) with the
 * `parsePgnWithFen` + `getFenAfterMoves` helpers from chess-core so
 * the modal can step through every position in the PGN.
 *
 * @design Bundle split
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
  const t = useTranslations('attachment');
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

  // Squares of the move that produced `currentFen`, so the enlarged board can
  // ring them like every other board does. Null before the first move.
  const lastMove = useMemo(
    () =>
      moveIndex === -1
        ? null
        : getLastMoveDetails(parsed.moves.slice(0, moveIndex + 1), startingFen),
    [moveIndex, parsed.moves, startingFen]
  );

  // Numbering follows the PGN's own starting position: a game set up from a
  // FEN where Black is to move opens at "12...Kh8", not "1. Kh8".
  const formattedPgn = useMemo(() => {
    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
    return formatMovesToPgn(parsed.moves, startsAsBlack, startMoveNumber);
  }, [parsed.moves, startingFen]);

  const showNavigation = totalMoves > 0;

  return (
    <BoardReviewModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('card.gameLabel')}
      fen={currentFen}
      lastMove={lastMove}
      flipped={flipped}
      onFlip={() => setFlipped((f) => !f)}
      formattedPgn={showNavigation ? formattedPgn : undefined}
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
