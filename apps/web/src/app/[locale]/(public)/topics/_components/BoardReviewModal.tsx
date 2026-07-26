'use client';

import { useEffect } from 'react';

import { useTranslations } from 'next-intl';

import { MiniBoard } from '@/lib/positions/ui/MiniBoard';

import { MoveNavigationControls } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationControls';
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
 *
 * @design Why the stepper IS shared even though the modal is not
 *
 * The « ‹ › » row is `MoveNavigationControls` — the same component every
 * other board in the app steps with. What keeps `BoardViewModal` out of
 * here is its `GamePreferences` coupling; the stepper has none of it (four
 * callbacks and two disabled flags), so duplicating it only bought a
 * second set of touch targets to forget about. It was in fact forgotten:
 * these buttons stayed at 36px when the shared ones were sized up for
 * thumbs. Flip and close sit beside it as `shrink-0` siblings, since the
 * stepper is full-width below `sm`.
 */

/**
 * Flip / close. They keep the stepper's 56px touch height on mobile so the
 * bottom row reads as one control strip rather than a tall stepper with two
 * small buttons stuck to it; from `sm` up they stay the compact 36px squares
 * that secondary actions use elsewhere.
 */
const SIDE_BUTTON_CLASS =
  'w-11 h-14 shrink-0 flex items-center justify-center hover:bg-muted active:bg-muted rounded transition-colors text-foreground sm:w-9 sm:h-9';

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
  const t = useTranslations('attachment.boardReview');

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
      aria-label={t('dialogLabel')}
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
                <MoveNavigationControls
                  onNavigateToStart={onNavigateToStart}
                  onNavigatePrevious={onNavigatePrevious}
                  onNavigateNext={onNavigateNext}
                  onNavigateToEnd={onNavigateToEnd}
                  isPreviousDisabled={isAtStart}
                  isNextDisabled={isAtEnd}
                />
                <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />
              </>
            )}
            <button
              type="button"
              onClick={onFlip}
              className={SIDE_BUTTON_CLASS}
              aria-label={t('flipBoard')}
            >
              &#x21C5;
            </button>
            <button
              type="button"
              onClick={onClose}
              className={SIDE_BUTTON_CLASS}
              aria-label={t('close')}
            >
              &times;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
