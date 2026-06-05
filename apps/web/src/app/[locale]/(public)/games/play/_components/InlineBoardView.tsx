'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { ChessBoard, FlipBoardButton } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';
import { FaChevronDown, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';

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
   * When true, the board stays in place (same position/size) but a frosted
   * overlay blurs it — the blindfold mask. This is the always-present-board
   * model for `boardVisibility` 'peek' / 'never': the board never changes
   * layout, only its mask toggles. The blur + tint is dense enough that piece
   * types can't be read; the masked board is also non-interactive (the overlay
   * intercepts pointer events).
   *
   * Note: the pieces ARE rendered (behind the blur) so a peek reveal is a plain
   * overlay removal — a client-side blindfold, not a hard secret.
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
  /**
   * Optional node centered over the board, above the mask (so it stays visible
   * in blindfold modes). Used by the play surface for the AI-reply chip. The
   * slot is `pointer-events-none`, so it never blocks a peek tap.
   */
  boardBadge?: ReactNode;
  /**
   * When true, the `boardBadge` currently occupies the board center, so the
   * mask's own center label ("tap to reveal" / "board hidden") steps aside to
   * avoid stacking two centered labels. The frosted cover and its tap-to-reveal
   * behavior are unaffected — only the label is suppressed.
   */
  badgeActive?: boolean;
  /**
   * Optional control pinned to the board's top-right corner, above the mask
   * (so it stays operable while blindfolded) and within the no-piece move-list
   * strip zone (so it never overlaps pieces). Used by the play surface for the
   * per-game settings gear. Unlike `boardBadge`, this slot IS interactive.
   */
  topRightControl?: ReactNode;
  /**
   * When true, a non-blocking "AI is thinking" overlay (a light scrim + a
   * centered spinner chip) is shown over the board. Used for `boardVisibility
   * === 'always'`, where the board is visible — so the blindfold mask and the
   * AI-reply chip are both absent — but the player still needs a clear "the
   * engine is working, not frozen" signal while a slow AI move is computed. In
   * blindfold modes the masked board + AiReplyChip already convey this, so this
   * is left off there. The overlay is `pointer-events-none` (the board is not
   * the player's to move during the AI's turn anyway), so navigation controls
   * underneath stay operable.
   */
  aiThinking?: boolean;
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
  boardBadge,
  badgeActive,
  topRightControl,
  aiThinking,
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
          {/* The board and the move-list strip above it share one mask: in
              blindfold modes the move list would otherwise reveal the game, so
              the frosted overlay covers both and a peek reveals both together. */}
          <div className="relative">
            {/* Horizontal Move List. Reserve right padding for the top-right
                control (settings gear) so the latest moves don't slide under it. */}
            {formattedPgn.length > 0 && onNavigateToPosition && (
              <div
                className={`overflow-x-auto px-2 py-1.5 ${topRightControl ? 'pr-10' : ''} ${alwaysOpen ? '' : 'border-t border-border'}`}
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
              showPieceDestinations={preferences.showPieceDestinations}
              pieceShapeMode={preferences.pieceShapeMode}
              pieceColors={preferences.pieceColors}
              boardTheme={preferences.boardTheme}
              rounded={false}
              // A masked board is non-interactive: the overlay sits on top and
              // intercepts pointer events, but null these defensively too so a
              // covered board never commits a move.
              onMove={masked ? undefined : onMove}
              onIllegalMove={masked ? undefined : onIllegalMove}
              movablePieces={movablePieces}
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

            {/* Blindfold mask: a frosted overlay over the whole board block —
                the move-list strip above, the board, and the navigation / flip
                controls below — so nothing board-related (incl. history
                stepping) shows or is operable while masked. The blur + tint
                hides piece types; tapping a dismissable mask reveals it all for
                a peek. */}
            {masked &&
              (maskDismissable ? (
                <button
                  type="button"
                  onClick={onReveal}
                  aria-label={t('revealBoard')}
                  className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-2xl transition-colors"
                >
                  {!badgeActive && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
                      <FaEye className="h-4 w-4" aria-hidden />
                      {t('revealBoard')}
                    </span>
                  )}
                </button>
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-2xl"
                  aria-label={t('boardHidden')}
                  role="img"
                >
                  {!badgeActive && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
                      <FaEyeSlash className="h-4 w-4" aria-hidden />
                      {t('boardHidden')}
                    </span>
                  )}
                </div>
              ))}

            {/* "AI is thinking" overlay for always-visible boards. A light
                scrim keeps the position readable while clearly reading as
                "busy", and a spinning chip distinguishes a slow-but-working
                engine from a frozen one. Non-interactive (z-20,
                pointer-events-none) so the move-list / navigation controls
                underneath stay clickable; the top-right gear (z-30) also stays
                above it. Only wired in 'always' mode — blindfold modes already
                show this via the masked board + AiReplyChip. */}
            {aiThinking && (
              <div
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/40"
                aria-live="polite"
              >
                <span className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-border bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-md backdrop-blur-sm">
                  <FaSpinner className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  <span className="truncate">{t('aiThinking')}</span>
                </span>
              </div>
            )}

            {/* Floating badge (AI-reply chip), centered over the board and
                layered above the mask so it stays visible while blindfolded.
                Non-interactive so a peek tap on the masked board still
                registers; the mask's own label steps aside via `badgeActive`. */}
            {boardBadge && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-2">
                {boardBadge}
              </div>
            )}

            {/* Top-right board control (settings gear), above the mask so it
                stays operable while blindfolded. Occupies only its own corner
                box, so it never blocks board interaction / a peek tap. */}
            {topRightControl && (
              <div className="absolute right-2 top-2 z-30">{topRightControl}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
