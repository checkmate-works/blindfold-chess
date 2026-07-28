'use client';

import { useTranslations } from 'next-intl';

import { MiniBoard } from '@/lib/positions/ui/MiniBoard';

import { HorizontalMoveList } from '@/app/[locale]/(public)/games/play/_components/HorizontalMoveList';
import { MoveNavigationRow } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationRow';
import type { FormattedPgnMove } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import { BoardModal } from '@/app/[locale]/_components/BoardModal';
import { useBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';

/**
 * Modal that enlarges an attachment's chess board with optional move
 * navigation. Used by `AttachedGameCard` (PGN — full move navigation)
 * and `AttachedFenCard` (single position — flip only).
 *
 * Chrome (full-bleed mobile layout, titled header, close button) comes
 * from `BoardModal`, shared with the other board modals; what is left
 * here is the attachment-specific body.
 *
 * @design Why a separate component from games/play's BoardViewModal
 *
 * games/play's `BoardViewModal` is tightly coupled to the blindfold
 * gameplay loop: it requires a `GamePreferences` instance (board
 * theme + per-piece visibility — `showOwnPieces`/`showOpponentPieces`
 * are blindfold-mode-specific), a `playerSide`, and emits an evaluation
 * mark. Reusing it on attached cards would let the user's blindfold
 * settings leak into the *display* of someone else's posted game,
 * which is the opposite of what the viewer wants when they tap to
 * enlarge an attachment. This modal is therefore an attached-card-
 * specific peer that picks up only the visual structure (top move
 * list, board, bottom controls) without the gameplay-state coupling.
 *
 * @design Pure display
 *
 * Move state lives in the caller — this modal does NOT import
 * `chess.js` directly. PGN-mode callers (`GameReplayModal`) compute
 * `currentFen` from the chess-core helpers and pass it down on each
 * navigation; FEN-mode callers (`AttachedFenCard`) pass a static fen
 * and omit the `moves` prop entirely so the navigation UI vanishes.
 * Keeping the modal chess.js-free means `AttachedFenCard` does not
 * need a dynamic import and the replay path stays bundle-split.
 *
 * @design Why the controls ARE shared even though the modal is not
 *
 * The strip below the board is `MoveNavigationRow` and the move list above
 * it is `HorizontalMoveList` — the same components every other board in the
 * app uses. What keeps `BoardViewModal` out of here is its
 * `GamePreferences` coupling; neither of those has any (callbacks, a
 * cursor, and a formatted move array), so duplicating them only bought
 * details to forget about. Both were in fact forgotten: the stepper stayed
 * at 36px when the shared one was sized up for thumbs, and the move list
 * wrapped onto several centred lines instead of scrolling horizontally,
 * which moved the board down the screen as a game got longer.
 */

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Header text — "Attached game" / "Attached position", matching the card. */
  title: string;
  /** FEN to render. PGN callers update this on every navigation. */
  fen: string;
  /** Squares of the move that produced `fen`; PGN callers update it in step.
   *  Honouring the highlight preference is handled here, not by the caller. */
  lastMove?: { from: string; to: string } | null;
  flipped: boolean;
  onFlip: () => void;
  // PGN-mode props. All four navigation handlers + currentMoveIndex
  // + formattedPgn must be passed together; omitting them all puts the
  // modal in static (FEN-only) mode and the navigation row collapses.
  formattedPgn?: FormattedPgnMove[];
  currentMoveIndex?: number;
  totalMoves?: number;
  onNavigateToStart?: () => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onNavigateToEnd?: () => void;
  onNavigateToIndex?: (index: number) => void;
};

export function BoardReviewModal({
  isOpen,
  onClose,
  title,
  fen,
  lastMove,
  flipped,
  onFlip,
  formattedPgn,
  currentMoveIndex,
  totalMoves,
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  onNavigateToIndex,
}: Props) {
  const t = useTranslations('attachment.boardReview');
  const display = useBoardDisplay(lastMove);

  if (!isOpen) return null;

  const showNavigation =
    formattedPgn !== undefined &&
    currentMoveIndex !== undefined &&
    totalMoves !== undefined &&
    onNavigateToStart !== undefined &&
    onNavigatePrevious !== undefined &&
    onNavigateNext !== undefined &&
    onNavigateToEnd !== undefined &&
    onNavigateToIndex !== undefined;

  const isAtStart = showNavigation && currentMoveIndex === -1;
  const isAtEnd = showNavigation && currentMoveIndex === totalMoves - 1;

  return (
    <BoardModal isOpen={isOpen} title={title} onClose={onClose} maxWidth="max-w-md">
      <>
        {showNavigation && (
          <HorizontalMoveList
            className="border-b border-border"
            formattedPgn={formattedPgn}
            currentPosition={currentMoveIndex}
            onNavigateToPosition={onNavigateToIndex}
          />
        )}

        <MiniBoard
          fen={fen}
          flipped={flipped}
          responsive
          lastMove={display.lastMove}
          showCoordinates={display.showCoordinates}
        />

        <MoveNavigationRow
          className="border-t border-border"
          onNavigateToStart={showNavigation ? onNavigateToStart : undefined}
          onNavigatePrevious={showNavigation ? onNavigatePrevious : undefined}
          onNavigateNext={showNavigation ? onNavigateNext : undefined}
          onNavigateToEnd={showNavigation ? onNavigateToEnd : undefined}
          isPreviousDisabled={isAtStart}
          isNextDisabled={isAtEnd}
          flip={{ onClick: onFlip, label: t('flipBoard') }}
        />
      </>
    </BoardModal>
  );
}
