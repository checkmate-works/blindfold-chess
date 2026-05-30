'use client';

import { useEffect, useRef, useState } from 'react';

import { ChessBoard, FlipBoardButton } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';
import { FaChevronDown, FaEye } from 'react-icons/fa';

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

          <ChessBoard
            fen={fen}
            flipped={flipped ?? playerSide === 'black'}
            playerSide={playerSide}
            lastMove={lastMove}
            showCoordinates={preferences.showCoordinates}
            showOwnPieces={preferences.showOwnPieces}
            showOpponentPieces={preferences.showOpponentPieces}
            pieceShapeMode={preferences.pieceShapeMode}
            pieceColors={preferences.pieceColors}
            boardTheme={preferences.boardTheme}
            rounded={false}
            onMove={onMove}
            onIllegalMove={onIllegalMove}
          />

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
