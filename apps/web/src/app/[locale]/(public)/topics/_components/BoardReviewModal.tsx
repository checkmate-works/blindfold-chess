'use client';

import { useEffect } from 'react';

import { MiniBoard } from '@/lib/positions/ui/MiniBoard';

import { useScrollLock } from '@/app/[locale]/_hooks/use-scroll-lock';

/**
 * Modal that enlarges an attachment's chess board with optional move
 * navigation. Used by `AttachedGameCard` (PGN — full move navigation)
 * and `AttachedFenCard` (single position — flip + close only).
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
 */

export type BoardReviewMovePair = {
  moveNumber: number;
  whiteMove: string;
  whiteIndex: number;
  blackMove?: string;
  blackIndex?: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** FEN to render. PGN callers update this on every navigation. */
  fen: string;
  flipped: boolean;
  onFlip: () => void;
  // PGN-mode props. All four navigation handlers + currentMoveIndex
  // + movePairs must be passed together; omitting them all puts the
  // modal in static (FEN-only) mode and the navigation row collapses.
  movePairs?: readonly BoardReviewMovePair[];
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
  fen,
  flipped,
  onFlip,
  movePairs,
  currentMoveIndex,
  totalMoves,
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  onNavigateToIndex,
}: Props) {
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showNavigation =
    movePairs !== undefined &&
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      // TODO(i18n): attachment.boardReview.dialogLabel
      aria-label="Board review"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />

      {/* Full-bleed + square corners on mobile (small screens need the whole
          width to read the board); bounded + rounded card at >=sm. Mirrors
          games/play's BoardViewModal. */}
      <div
        className="relative z-10 w-full max-w-md px-0 sm:px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-none sm:rounded-md overflow-hidden bg-card">
          {showNavigation && movePairs.length > 0 && (
            <div className="px-2 py-2 overflow-x-auto border-b border-border">
              <div className="flex items-center gap-1 text-xs whitespace-nowrap flex-wrap justify-center">
                {movePairs.map((pair) => (
                  <div key={pair.moveNumber} className="flex items-center gap-0.5">
                    <span className="text-muted-foreground">{pair.moveNumber}.</span>
                    <button
                      type="button"
                      className={`px-1 py-0.5 rounded transition-colors ${
                        currentMoveIndex === pair.whiteIndex
                          ? 'bg-foreground/15 font-semibold'
                          : 'hover:bg-muted/40'
                      }`}
                      onClick={() => onNavigateToIndex(pair.whiteIndex)}
                    >
                      {pair.whiteMove}
                    </button>
                    {pair.blackMove && pair.blackIndex !== undefined && (
                      <button
                        type="button"
                        className={`px-1 py-0.5 rounded transition-colors ${
                          currentMoveIndex === pair.blackIndex
                            ? 'bg-foreground/15 font-semibold'
                            : 'hover:bg-muted/40'
                        }`}
                        onClick={() =>
                          pair.blackIndex !== undefined && onNavigateToIndex(pair.blackIndex)
                        }
                      >
                        {pair.blackMove}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <MiniBoard fen={fen} flipped={flipped} responsive />

          <div className="flex items-center justify-center gap-1 px-2 py-2 border-t border-border">
            {showNavigation && (
              <>
                <button
                  type="button"
                  onClick={onNavigateToStart}
                  disabled={isAtStart}
                  className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-lg text-foreground"
                  // TODO(i18n): attachment.boardReview.navStart
                  aria-label="Go to start"
                >
                  &laquo;
                </button>
                <button
                  type="button"
                  onClick={onNavigatePrevious}
                  disabled={isAtStart}
                  className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-lg text-foreground"
                  // TODO(i18n): attachment.boardReview.navPrevious
                  aria-label="Previous move"
                >
                  &lsaquo;
                </button>
                <button
                  type="button"
                  onClick={onNavigateNext}
                  disabled={isAtEnd}
                  className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-lg text-foreground"
                  // TODO(i18n): attachment.boardReview.navNext
                  aria-label="Next move"
                >
                  &rsaquo;
                </button>
                <button
                  type="button"
                  onClick={onNavigateToEnd}
                  disabled={isAtEnd}
                  className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent font-mono text-lg text-foreground"
                  // TODO(i18n): attachment.boardReview.navEnd
                  aria-label="Go to end"
                >
                  &raquo;
                </button>
                <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
              </>
            )}
            <button
              type="button"
              onClick={onFlip}
              className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded transition-colors text-foreground"
              // TODO(i18n): attachment.boardReview.flipBoard
              aria-label="Flip board"
            >
              &#x21C5;
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded transition-colors text-foreground"
              // TODO(i18n): attachment.boardReview.close
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
