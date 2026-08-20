'use client';

import { useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { getStartingFen, parsePgnWithFen } from '@blindfold-chess/features/chess-core';

import { usePgnReplay } from '@/app/[locale]/_hooks/use-pgn-replay';

import { BoardReviewModal } from './BoardReviewModal';

/**
 * Modal wrapper that owns chess.js move-state for an attached PGN
 * game. Pairs `BoardReviewModal` (pure display) with `parsePgnWithFen`
 * and the shared `usePgnReplay` cursor so the modal can step through
 * every position in the PGN.
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
    const result = parsePgnWithFen(pgn);
    // Defensive: validateAttachedPgn already accepted this PGN at write time,
    // so a parse failure here means the row is corrupt or chess.js changed
    // behavior. Fall back to no-moves rather than crashing the modal.
    return result.ok ? result.value : { moves: [] as string[], startingFen: undefined };
  }, [pgn]);

  const startingFen = parsed.startingFen ?? getStartingFen();
  const [flipped, setFlipped] = useState(false);

  // Opens at the final position, so the user sees the same board the summary
  // card showed in its thumbnail — `fallbackFen` is exactly that position, so
  // no move is replayed to get there.
  const replay = usePgnReplay({
    moves: parsed.moves,
    startingFen,
    finalFen: fallbackFen,
  });

  const showNavigation = replay.total > 0;

  return (
    <BoardReviewModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('card.gameLabel')}
      fen={replay.fen}
      lastMove={replay.lastMove}
      flipped={flipped}
      onFlip={() => setFlipped((f) => !f)}
      formattedPgn={showNavigation ? replay.formattedPgn : undefined}
      currentMoveIndex={showNavigation ? replay.index : undefined}
      totalMoves={showNavigation ? replay.total : undefined}
      onNavigateToStart={showNavigation ? replay.toStart : undefined}
      onNavigatePrevious={showNavigation ? replay.previous : undefined}
      onNavigateNext={showNavigation ? replay.next : undefined}
      onNavigateToEnd={showNavigation ? replay.toEnd : undefined}
      onNavigateToIndex={showNavigation ? replay.toIndex : undefined}
    />
  );
}
