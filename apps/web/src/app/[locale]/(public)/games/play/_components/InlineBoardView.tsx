'use client';

import { type ReactNode, useState } from 'react';

import { ChessBoard } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';
import { FaChevronDown, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';

import type { TerminationMark } from '@/lib/games/termination-mark';

import type { FormattedPgnMove } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { resolveBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';

import {
  INLINE_BOARD_CARD_CHROME,
  INLINE_BOARD_HEADER_CHROME,
  STATUS_PILL_CLASSES,
} from '../_lib/skeleton-layout-classes';
import { HorizontalMoveList } from './HorizontalMoveList';
import { MoveNavigationRow } from './MoveNavigationRow';

/**
 * Everything relayed straight through to the inner {@link ChessBoard}. Grouped
 * because it IS that component's interface: this view adds chrome around a
 * board, it does not reinterpret how the board draws itself. See `ChessBoard`'s
 * own prop docs for the semantics of each field.
 */
export type InlineBoardChessProps = {
  fen: string;
  playerSide: Side;
  /** Defaults to "flipped iff `playerSide` is black". */
  flipped?: boolean;
  lastMove: { from: string; to: string } | null;
  preferences: GamePreferences;
  /**
   * How pieces hidden by the blindfold settings are drawn. Defaults to
   * `'absent'` (live play); the finished-game review passes `'ghost'` when
   * reproducing the player's view.
   */
  hiddenPieceStyle?: 'absent' | 'ghost';
  illegalAttempt?: { from?: string; to?: string } | null;
  /**
   * Defaults to `'own'` (real-game rule: only the player's pieces respond).
   * Recall passes `'side-to-move'` so the reviewer can also move the
   * opponent's pieces on the opponent's turn.
   */
  movablePieces?: 'own' | 'side-to-move';
  terminationMark?: TerminationMark | null;
  terminationMarkLabel?: string;
  /**
   * Enables interactive move input, firing once per completed legal move with
   * the SAN string. The parent gates this on game state (player's turn, not
   * browsing history, …); this view additionally suppresses it while a mask is
   * up, so a covered board can never commit a move.
   */
  onMove?: (san: string) => void;
  /**
   * Fires once per illegal move attempt so always-visible games can count
   * board-driven blindfold mistakes. Suppressed while masked, like `onMove`.
   */
  onIllegalMove?: (attempt?: string, squares?: { from: string; to: string }) => void;
};

/** The horizontal move-list strip above the board, and what the nav row enables. */
export type InlineBoardMoveListProps = {
  movesLength: number;
  currentPosition: number;
  formattedPgn: FormattedPgnMove[];
};

/**
 * Navigation callbacks for the strip and the control row below the board. All
 * optional: a static board (a position preview) supplies none, and the row
 * hides itself when there is nothing to drive.
 */
export type InlineBoardNavigationProps = {
  onNavigateToStart?: () => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onNavigateToEnd?: () => void;
  onNavigateToPosition?: (position: number) => void;
  onFlipBoard?: () => void;
};

/**
 * The blindfold mask: a frosted overlay over the whole board block (move-list
 * strip, board, nav row) so nothing board-related shows or is operable while it
 * is up.
 *
 * Note the pieces ARE rendered behind the blur, so a reveal is a plain overlay
 * removal — a client-side blindfold, not a hard secret.
 */
export type InlineBoardMask = {
  /** Whether the cover is currently up. */
  active: boolean;
  /**
   * Whether tapping the cover reveals the board. True for `boardVisibility ===
   * 'peek'`; false for `'never'` (pure blindfold), which renders as a compact
   * bar instead of a full-size board under a permanent cover.
   */
  dismissable: boolean;
  /**
   * Invoked when the viewer taps a dismissable cover. The parent owns the
   * reveal / re-mask lifecycle and the peek-count accounting.
   */
  onReveal?: () => void;
};

/**
 * How the board is surfaced — the two shapes are mutually exclusive, which is
 * why they are a union rather than independent flags. Previously this was six
 * separate booleans/callbacks that the component recombined internally, so
 * "always-open but with a collapse signal" was expressible and meaningless.
 */
export type InlineBoardVisibility =
  | {
      /**
       * Collapsible accordion behind a "Show board" header, closed on mount.
       * Used where revealing the board is itself the tracked action (puzzle).
       */
      kind: 'accordion';
      /** Fired on each expand — one expand counts as one peek. */
      onPeek?: () => void;
    }
  | {
      /**
       * Board permanently on screen with no collapse chrome, optionally under a
       * blindfold {@link InlineBoardMask}. Used for `boardVisibility` 'always'
       * (no mask), 'peek' and 'never' (masked), and for finished-game review.
       */
      kind: 'always';
      mask?: InlineBoardMask;
    };

/** Optional chrome layered over / around the board. */
export type InlineBoardSlots = {
  /**
   * Node centered over the board, above the mask (so it stays visible in
   * blindfold modes). Used by the play surface for the AI-reply chip. The slot
   * is `pointer-events-none`, so it never blocks a peek tap.
   */
  boardBadge?: ReactNode;
  /**
   * When true, `boardBadge` currently occupies the board center, so the mask's
   * own center label steps aside to avoid stacking two centered labels. The
   * cover and its tap-to-reveal behavior are unaffected.
   */
  badgeActive?: boolean;
  /**
   * Control pinned to the board's top-right corner, above the mask (so it stays
   * operable while blindfolded) and within the no-piece move-list strip zone.
   * Used for the per-game settings gear. Unlike `boardBadge`, this IS interactive.
   */
  topRightControl?: ReactNode;
  /**
   * Extra control for the bottom control strip, after the flip button — relayed
   * to {@link MoveNavigationRow}'s slot of the same name. Style it with
   * `MOVE_NAV_SIDE_BUTTON_CLASS` so it matches the flip button. The strip's card
   * clips its descendants, so anything that pops out (a menu) must open upward.
   */
  trailingAction?: ReactNode;
  /**
   * Non-blocking "AI is thinking" overlay (light scrim + spinner chip). Used for
   * `boardVisibility === 'always'`, where the board is visible — so mask and
   * AI-reply chip are both absent — but the player still needs a clear "the
   * engine is working, not frozen" signal. `pointer-events-none`, so the
   * navigation controls underneath stay operable.
   */
  aiThinking?: boolean;
};

type Props = {
  board: InlineBoardChessProps;
  moveList: InlineBoardMoveListProps;
  navigation?: InlineBoardNavigationProps;
  visibility: InlineBoardVisibility;
  slots?: InlineBoardSlots;
};

export function InlineBoardView({
  board,
  moveList,
  navigation = {},
  visibility,
  slots = {},
}: Props) {
  const t = useTranslations('play');
  const [isOpen, setIsOpen] = useState(false);

  const {
    fen,
    playerSide,
    flipped,
    lastMove,
    preferences,
    hiddenPieceStyle = 'absent',
    illegalAttempt = null,
    movablePieces,
    terminationMark = null,
    terminationMarkLabel,
    onMove,
    onIllegalMove,
  } = board;
  const { movesLength, currentPosition, formattedPgn } = moveList;
  const {
    onNavigateToStart,
    onNavigatePrevious,
    onNavigateNext,
    onNavigateToEnd,
    onNavigateToPosition,
    onFlipBoard,
  } = navigation;
  const { boardBadge, badgeActive, topRightControl, trailingAction, aiThinking } = slots;

  const alwaysOpen = visibility.kind === 'always';
  const mask = visibility.kind === 'always' ? visibility.mask : undefined;
  const masked = mask?.active ?? false;

  // In always-open mode the board is unconditionally visible. The accordion's
  // own `isOpen` is left untouched, so the two modes never interfere.
  const effectivelyOpen = alwaysOpen ? true : isOpen;

  // Pure blindfold ('never'): the board is never revealed. Rather than render a
  // full-size board under a permanent frosted cover — which wastes the board's
  // vertical space and forces the player to scroll between the (hidden)
  // position and the move input — collapse it to a compact bar (see below).
  const isBlindfoldNever = masked && !mask?.dismissable;

  return (
    <div className={INLINE_BOARD_CARD_CHROME}>
      {visibility.kind === 'accordion' && (
        <button
          type="button"
          onClick={() => {
            if (!isOpen) visibility.onPeek?.();
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
      {effectivelyOpen && isBlindfoldNever && (
        // Compact blindfold bar: no board, no move list, no history nav —
        // surfacing any of those would defeat the blindfold. Only the two
        // affordances that must survive without a board remain: the AI-reply
        // chip (the sole signal of the opponent's move in pure blindfold play)
        // and the settings gear (the way back out of blindfold mode).
        <div className="relative flex h-16 items-center justify-center px-4">
          {/* Fixed height (not min-h + padding): the chip and label differ in
              height — the chip's move notation is text-lg — so a content-sized
              box would grow/shrink between them and shift everything below.
              A constant height centers whichever is shown with zero layout
              shift. They share this one flow slot (mutually exclusive via
              badgeActive) so both are centered identically. */}
          {boardBadge && badgeActive ? (
            boardBadge
          ) : (
            <span className={`${STATUS_PILL_CLASSES} bg-muted text-muted-foreground`}>
              <FaEyeSlash className="h-4 w-4" aria-hidden />
              {t('boardHidden')}
            </span>
          )}
          {topRightControl && <div className="absolute right-2 top-2 z-30">{topRightControl}</div>}
        </div>
      )}
      {effectivelyOpen && !isBlindfoldNever && (
        <div>
          {/* The board and the move-list strip above it share one mask: in
              blindfold modes the move list would otherwise reveal the game, so
              the frosted overlay covers both and a peek reveals both together. */}
          <div className="relative">
            {/* Horizontal Move List. Reserve right padding for the top-right
                control (settings gear) so the latest moves don't slide under it. */}
            {onNavigateToPosition && (
              <HorizontalMoveList
                className={`${topRightControl ? 'pr-10' : ''} ${alwaysOpen ? '' : 'border-t border-border'}`}
                formattedPgn={formattedPgn}
                currentPosition={currentPosition}
                onNavigateToPosition={onNavigateToPosition}
              />
            )}
            <ChessBoard
              fen={fen}
              flipped={flipped ?? playerSide === 'black'}
              playerSide={playerSide}
              showOwnPieces={preferences.showOwnPieces}
              showOpponentPieces={preferences.showOpponentPieces}
              showPieceDestinations={preferences.showPieceDestinations}
              pieceShapeMode={preferences.pieceShapeMode}
              pieceColors={preferences.pieceColors}
              pawnHideMode={preferences.pawnHideMode}
              hiddenPieceStyle={hiddenPieceStyle}
              {...resolveBoardDisplay(preferences, lastMove)}
              rounded={false}
              // A masked board is non-interactive: the overlay sits on top and
              // intercepts pointer events, but null these defensively too so a
              // covered board never commits a move.
              onMove={masked ? undefined : onMove}
              onIllegalMove={masked ? undefined : onIllegalMove}
              illegalAttempt={illegalAttempt}
              movablePieces={movablePieces}
              terminationMark={terminationMark}
              terminationMarkLabel={terminationMarkLabel}
            />
            {/* Navigation Controls & Flip Button */}
            {(movesLength > 0 || onFlipBoard || trailingAction) && (
              <MoveNavigationRow
                onNavigateToStart={movesLength > 0 ? onNavigateToStart : undefined}
                onNavigatePrevious={movesLength > 0 ? onNavigatePrevious : undefined}
                onNavigateNext={movesLength > 0 ? onNavigateNext : undefined}
                onNavigateToEnd={movesLength > 0 ? onNavigateToEnd : undefined}
                isPreviousDisabled={
                  currentPosition === -2 || (currentPosition === -1 && movesLength === 0)
                }
                isNextDisabled={
                  currentPosition === -1 || (movesLength > 0 && currentPosition === movesLength - 1)
                }
                flip={onFlipBoard ? { onClick: onFlipBoard, label: t('flipBoard') } : undefined}
                trailingAction={trailingAction}
              />
            )}

            {/* Blindfold peek mask: a frosted overlay over the whole board
                block — the move-list strip above, the board, and the navigation
                / flip controls below — so nothing board-related (incl. history
                stepping) shows or is operable while masked. The blur + tint
                hides piece types; tapping reveals it all for a peek. (The
                'never' mode never reaches here — it renders the compact bar
                above instead, so this branch is always the dismissable peek.) */}
            {masked && (
              <button
                type="button"
                onClick={mask?.onReveal}
                aria-label={t('revealBoard')}
                className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-2xl transition-colors"
              >
                {!badgeActive && (
                  <span
                    className={`${STATUS_PILL_CLASSES} bg-background/80 text-foreground shadow-sm`}
                  >
                    <FaEye className="h-4 w-4" aria-hidden />
                    {t('revealBoard')}
                  </span>
                )}
              </button>
            )}

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
