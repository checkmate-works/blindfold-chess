'use client';

import { BoardFrame } from '@/app/_components';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  fen: string;
};

/**
 * Collapsible "show board" peek for the blindfold position-detail pages
 * (puzzle / position-memory). Closed by default: those pages are otherwise a
 * text-only piece list (`PiecesInfo`), and expanding this reveals the full
 * visual board on demand — the same "Show board" accordion the solving session
 * uses (`InlineBoardView`), so the affordance is identical across both
 * surfaces.
 *
 * Deliberately non-interactive and always reveals every piece: this is a
 * look-at-the-position aid, not a scored session, so there is no move input,
 * no peek counting, and no blindfold masking. The board is oriented toward the
 * side to move so the position reads the way the solver will face it.
 */
export function PositionPeekBoard({ fen }: Props) {
  const { preferences } = useGamePreferences();
  const blackToMove = isBlackToMoveFromFen(fen);

  return (
    <BoardFrame>
      <InlineBoardView
        fen={fen}
        playerSide={blackToMove ? 'black' : 'white'}
        flipped={blackToMove}
        lastMove={null}
        preferences={{ ...preferences, showOwnPieces: true, showOpponentPieces: true }}
        movesLength={0}
        currentPosition={-1}
        formattedPgn={[]}
      />
    </BoardFrame>
  );
}
