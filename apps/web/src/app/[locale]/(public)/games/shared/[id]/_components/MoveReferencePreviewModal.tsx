'use client';

import { useMemo } from 'react';

import { ChessBoard } from '@/app/_components';
import { formatMovesToPgn, getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationRow } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationRow';
import { useMoveNavigation } from '@/app/[locale]/(public)/games/play/_hooks';
import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { computeMoveNumber } from '@/app/[locale]/(public)/practice/(free-play)/recall/_lib/compute-move-number';
import { BoardModal } from '@/app/[locale]/_components/BoardModal';
import { useBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';

type Props = {
  onClose: () => void;
  /** The raw matched text (e.g. "8. Bd3 Bb7 9. O-O") — shown as the modal title verbatim. */
  raw: string;
  /** Verified-legal candidate moves for the referenced sequence. */
  sans: string[];
  /** Position immediately before the first move in `sans`. */
  baseFen: string;
  /** 0-based ply `sans[0]` would occupy in the game's own move list. */
  basePly: number;
  /** The game's starting FEN, for the step labels' move-number base. */
  startingFen: string | null;
  playerColor: Side;
};

/**
 * Previews a comment's PGN-style move reference, steppable forward through
 * each suggested move. Navigation is scoped to just this branch (`sans`), not
 * the whole game — `useMoveNavigation`'s position range is [-2 .. sans.length
 * - 1] here. It opens on the FIRST move (`initialPosition: 0`, e.g. the "Bxa7"
 * of "Bxa7 b6") so the reader starts at the head of the line and steps
 * forward, with "previous" available back to the position before it (-2).
 * Mounted only while open (the caller conditionally renders it), so navigation
 * state resets between references for free.
 *
 * Chrome and move list are the house board+moves stack — `BoardModal` around
 * it, `HorizontalMoveList` above the board, `MoveNavigationRow` below it — so
 * this reads the same as the quick-peek modal and the inline board rather
 * than inventing a third arrangement.
 */
export function MoveReferencePreviewModal({
  onClose,
  raw,
  sans,
  baseFen,
  basePly,
  startingFen,
  playerColor,
}: Props) {
  const nav = useMoveNavigation({
    moves: sans as AlgebraicNotation[],
    startingFen: baseFen,
    initialPosition: 0,
  });

  // The branch is renumbered against the GAME's clock: `basePly` says which ply
  // `sans[0]` occupies, so a run quoted mid-game still reads "8...Nf6 9. O-O".
  // `formatMovesToPgn` then indexes each move by its offset within `sans`, which
  // is exactly the cursor space `useMoveNavigation` is scoped to here — so the
  // list's indices need no remapping.
  const formattedPgn = useMemo(() => {
    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
    const base = computeMoveNumber(basePly, startsAsBlack, startMoveNumber);
    return formatMovesToPgn(sans, !base.isWhiteMove, base.moveNumber);
  }, [sans, basePly, startingFen]);

  const effectivePosition =
    nav.currentPosition === -1
      ? sans.length - 1
      : nav.currentPosition === -2
        ? -1
        : nav.currentPosition;

  const fen = nav.displayFen ?? nav.latestFen;
  const lastMove =
    nav.currentPosition === -2
      ? null
      : getLastMoveDetails(
          nav.currentPosition === -1 ? sans : sans.slice(0, nav.currentPosition + 1),
          baseFen
        );

  const display = useBoardDisplay(lastMove);

  return (
    <BoardModal onClose={onClose} title={raw} maxWidth="max-w-lg">
      {/* Move strip above the board, then board, then the 8:1 nav row — the
          same stack every other board+moves surface uses (InlineBoardView,
          BoardViewModal, the repertoire viewers). */}
      <div>
        <HorizontalMoveList
          className="bg-card"
          formattedPgn={formattedPgn}
          currentPosition={effectivePosition}
          onNavigateToPosition={(position) => nav.navigateToPosition(position)}
        />

        <ChessBoard fen={fen} flipped={playerColor === 'black'} rounded={false} {...display} />

        <MoveNavigationRow
          onNavigateToStart={nav.navigateToStart}
          onNavigatePrevious={nav.navigatePrevious}
          onNavigateNext={nav.navigateNext}
          onNavigateToEnd={nav.navigateToEnd}
          isPreviousDisabled={nav.currentPosition === -2}
          isNextDisabled={
            nav.currentPosition === -1 ||
            (sans.length > 0 && nav.currentPosition === sans.length - 1)
          }
          className="bg-card"
        />
      </div>
    </BoardModal>
  );
}
