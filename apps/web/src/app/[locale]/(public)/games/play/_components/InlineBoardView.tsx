'use client';

import { useEffect, useRef, useState } from 'react';

import { ChessBoard, FlipBoardButton } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';
import { FaChevronDown, FaEye, FaEyeSlash } from 'react-icons/fa';

import type { FormattedPgnMove } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import {
  INLINE_BOARD_CARD_CHROME,
  INLINE_BOARD_HEADER_CHROME,
} from '../_lib/skeleton-layout-classes';
import { HorizontalMoveList } from './HorizontalMoveList';
import { MoveNavigationControls } from './MoveNavigationControls';

type Props = {
  fen: string;
  playerSide: Side;
  flipped?: boolean;
  lastMove: { from: string; to: string } | null;
  preferences: GamePreferences;
  movesLength: number;
  currentPosition: number;
  formattedPgn: FormattedPgnMove[];
  onNavigateToStart?: () => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onNavigateToEnd?: () => void;
  onNavigateToPosition?: (position: number) => void;
  onFlipBoard?: () => void;
  onPeek?: () => void;
  /**
   * Monotonic counter bumped by the parent each time the player commits a
   * move. A change here auto-collapses the inline board so the next peek
   * requires a fresh expand — which fires `onPeek` again, keeping the
   * peek-count semantics symmetric with the modal mode (1 expand = 1 peek).
   * Ignored when `alwaysOpen` is true.
   */
  collapseSignal?: number;
  /**
   * When true, the collapse chrome is removed, the board is permanently
   * visible, and `collapseSignal` is ignored. Used for `boardVisibility ===
   * 'always'`: the player has declared they want the board on screen, so
   * there is no "peek" event to track (`onPeek` is also not invoked in this
   * mode — the audit story shifts to the visual settings doing the
   * obfuscation rather than discrete peek actions).
   */
  alwaysOpen?: boolean;
  /**
   * Optional move handler. When provided, the inner ChessBoard switches
   * into interactive mode (click-to-move + HTML5 drag-and-drop on
   * own-color pieces). Fires once per completed legal move with the SAN
   * string. The parent is responsible for gating this on the current
   * game state (player's turn, not browsing history, etc.) — InlineBoardView
   * itself only relays the callback.
   */
  onMove?: (san: string) => void;
  /**
   * Relayed straight to the inner ChessBoard. Fires once per illegal move
   * attempt (illegal drop / destination click) so always-visible games can
   * count board-driven blindfold mistakes. See `ChessBoard`'s prop doc.
   */
  onIllegalMove?: () => void;
  /**
   * Relayed to the inner ChessBoard. Defaults to `'own'` (real-game rule:
   * only the player's pieces respond). Postmortem passes `'side-to-move'` so
   * the reviewer can also move the opponent's pieces on the opponent's turn.
   */
  movablePieces?: 'own' | 'side-to-move';
  /**
   * When true, the board frame stays in place but its pieces are NOT painted
   * and an opaque overlay covers it — the blindfold mask. This is the
   * always-present-board model for `boardVisibility` 'peek' / 'never': the
   * board never changes position or size, only its mask toggles.
   *
   * Pieces are suppressed (not merely hidden under the cover) so their
   * positions never reach the DOM while masked. Independent of `alwaysOpen` —
   * the board is still rendered; it is just masked.
   */
  masked?: boolean;
  /**
   * Invoked when the viewer taps a dismissable mask to reveal the board. Only
   * wired when `maskDismissable` is true (peek). The parent owns the reveal /
   * re-mask lifecycle and the peek-count accounting.
   */
  onReveal?: () => void;
  /**
   * Whether tapping the mask reveals the board. True for `boardVisibility ===
   * 'peek'` (tap to peek); false for `'never'` (pure blindfold — the cover
   * stays put and is non-interactive). Ignored unless `masked` is true.
   */
  maskDismissable?: boolean;
};

export function InlineBoardView({
  fen,
  playerSide,
  flipped,
  lastMove,
  preferences,
  movesLength,
  currentPosition,
  formattedPgn,
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  onNavigateToPosition,
  onFlipBoard,
  onPeek,
  collapseSignal,
  alwaysOpen,
  onMove,
  onIllegalMove,
  movablePieces,
  masked,
  onReveal,
  maskDismissable,
}: Props) {
  const t = useTranslations('play');
  const [isOpen, setIsOpen] = useState(false);

  // Auto-collapse when the parent's collapse signal changes (player committed
  // a move). The initial-mount run is skipped so a freshly opened page does
  // not redundantly close an already-closed accordion. Also short-circuited
  // in always-open mode: the board has no collapse to trigger.
  const lastSeenSignal = useRef(collapseSignal);
  useEffect(() => {
    if (alwaysOpen) return;
    if (collapseSignal === undefined) return;
    if (lastSeenSignal.current !== collapseSignal) {
      lastSeenSignal.current = collapseSignal;
      setIsOpen(false);
    }
  }, [collapseSignal, alwaysOpen]);

  // In always-open mode the board is unconditionally visible. The local
  // `isOpen` state is left untouched so toggling alwaysOpen on/off restores
  // the previous peek-collapse state cleanly.
  const effectivelyOpen = alwaysOpen ? true : isOpen;

  return (
    <div className={INLINE_BOARD_CARD_CHROME}>
      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => {
            if (!isOpen) onPeek?.();
            setIsOpen(!isOpen);
          }}
          className={`${INLINE_BOARD_HEADER_CHROME} text-left hover:bg-muted transition-colors`}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FaEye className="w-4 h-4" />
            <span>{t('showBoard')}</span>
          </div>
          <FaChevronDown
            className={`w-3 h-3 text-muted-foreground transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}
      {effectivelyOpen && (
        <div>
          {/* Horizontal Move List */}
          {formattedPgn.length > 0 && onNavigateToPosition && (
            <div
              className={`px-2 py-1.5 overflow-x-auto ${alwaysOpen ? '' : 'border-t border-border'}`}
            >
              <HorizontalMoveList
                formattedPgn={formattedPgn}
                currentPosition={currentPosition}
                onNavigateToPosition={onNavigateToPosition}
              />
            </div>
          )}

          <div className="relative">
            <ChessBoard
              fen={fen}
              flipped={flipped ?? playerSide === 'black'}
              playerSide={playerSide}
              lastMove={lastMove}
              showCoordinates={preferences.showCoordinates}
              // While masked, suppress pieces entirely so their positions never
              // reach the DOM behind the cover (the blindfold must not leak).
              showOwnPieces={masked ? false : preferences.showOwnPieces}
              showOpponentPieces={masked ? false : preferences.showOpponentPieces}
              pieceShapeMode={preferences.pieceShapeMode}
              pieceColors={preferences.pieceColors}
              boardTheme={preferences.boardTheme}
              rounded={false}
              // A masked board is never interactive (no peeking the legal-move
              // dots, no dragging covered pieces).
              onMove={masked ? undefined : onMove}
              onIllegalMove={masked ? undefined : onIllegalMove}
              movablePieces={movablePieces}
            />
            {masked &&
              (maskDismissable ? (
                <button
                  type="button"
                  onClick={onReveal}
                  aria-label={t('revealBoard')}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground transition-colors hover:text-foreground"
                >
                  <FaEye className="h-7 w-7" aria-hidden />
                  <span className="text-sm font-medium">{t('revealBoard')}</span>
                </button>
              ) : (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground"
                  aria-label={t('boardHidden')}
                  role="img"
                >
                  <FaEyeSlash className="h-7 w-7" aria-hidden />
                  <span className="text-sm font-medium">{t('boardHidden')}</span>
                </div>
              ))}
          </div>

          {/* Navigation Controls & Flip Button */}
          {(movesLength > 0 || onFlipBoard) && (
            <div
              className="flex items-center justify-center relative"
              style={{ aspectRatio: '8/1' }}
            >
              {movesLength > 0 &&
                onNavigateToStart &&
                onNavigatePrevious &&
                onNavigateNext &&
                onNavigateToEnd && (
                  <MoveNavigationControls
                    onNavigateToStart={onNavigateToStart}
                    onNavigatePrevious={onNavigatePrevious}
                    onNavigateNext={onNavigateNext}
                    onNavigateToEnd={onNavigateToEnd}
                    isPreviousDisabled={
                      currentPosition === -2 || (currentPosition === -1 && movesLength === 0)
                    }
                    isNextDisabled={
                      currentPosition === -1 ||
                      (movesLength > 0 && currentPosition === movesLength - 1)
                    }
                  />
                )}
              {onFlipBoard && (
                <FlipBoardButton
                  onClick={onFlipBoard}
                  title={t('flipBoard')}
                  className="absolute right-3 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
