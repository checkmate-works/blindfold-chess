'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { ChessPiece } from '@/app/_components';
import type { BoardPiece, MoveResult } from '@blindfold-chess/features/chess-core';
import {
  fenToBoard,
  findLegalMovesByCoords,
  getLegalMoves,
} from '@blindfold-chess/features/chess-core';
import type { Side } from '@blindfold-chess/types';
import { createPortal } from 'react-dom';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';
import type { EvaluationMark } from '@/lib/games/evaluation';
import { getEvaluationIcon } from '@/lib/games/evaluation';

import type { SquareRenderInfo } from './BoardLayout';
import { BoardLayout } from './BoardLayout';
import { PromotionPicker } from './PromotionPicker';
import { useBoardDragDrop } from './use-board-drag-drop';

/**
 * Stable empty-array identity for the `highlightedSquares` default prop.
 * Hoisted to module scope so `memo(ChessBoard)`'s shallow-equality check
 * sees the same reference across renders when no callers override it,
 * avoiding unnecessary re-renders on hot paths (play, move navigation,
 * feed/thumbnail lists). Frozen to prevent accidental mutation.
 */
const EMPTY_HIGHLIGHTED_SQUARES: string[] = Object.freeze([] as string[]) as unknown as string[];

type Props = {
  fen: string;
  flipped?: boolean;
  playerSide?: Side;
  lastMove?: { from: string; to: string } | null;
  onSquareClick?: (square: string) => void;
  highlightedSquares?: string[];
  showCoordinates?: boolean;
  showOwnPieces?: boolean;
  showOpponentPieces?: boolean;
  /**
   * Whether selecting a piece in interactive mode reveals its legal
   * destinations (the centered move dots / capture rings). Defaults to `true`.
   * When `false`, click-to-move and drag still work and are still validated —
   * only the visual hint is suppressed (a harder, hint-free board). Already
   * implicitly off when the dots would leak hidden information — pieces shown as
   * stones or hidden (see {@link destinationsObscured}); single-colour mode
   * keeps the shapes, so dots still show there.
   */
  showPieceDestinations?: boolean;
  pieceShapeMode?: 'normal' | 'circles-all' | 'circles-own' | 'circles-opponent';
  pieceColors?: 'normal' | 'white-only' | 'black-only';
  /**
   * Partial blindfold: which pawns are hidden entirely (rendered as empty
   * squares). `'none'` (default) shows every pawn; `'all'` hides both sides';
   * `'own'` / `'opponent'` hide only that side's pawns. Orthogonal to
   * `showOwnPieces` / `showOpponentPieces` (which hide whole sides) and to the
   * shape / color obfuscation — a hidden side already hides its pawns, so this
   * only bites on a side that is otherwise shown.
   */
  pawnHideMode?: 'none' | 'all' | 'own' | 'opponent';
  /**
   * How pieces hidden by the blindfold settings (`showOwnPieces` /
   * `showOpponentPieces` / `pawnHideMode`) are drawn:
   * - `'absent'` (default) — rendered as an empty square, i.e. truly invisible.
   *   This is what a player must see during live blindfold play.
   * - `'ghost'` — rendered as a faint, translucent copy of the real piece.
   *   Used ONLY by the finished-game review's "As Played" toggle, where a
   *   ghost both conveys what the player could not see and distinguishes a
   *   hidden-occupied square from a genuinely empty one. Shape / colour
   *   obfuscation is intentionally skipped for a ghost — it shows the true
   *   piece so the reviewer learns what was hidden.
   */
  hiddenPieceStyle?: 'absent' | 'ghost';
  boardTheme?: BoardTheme;
  rounded?: boolean;
  evaluationMark?: EvaluationMark | null;
  className?: string;
  /**
   * Optional pre-parsed display annotations. Passed straight through to
   * {@link BoardLayout}; callers feed JSONB through `parseBoardAnnotations`
   * on the server side first.
   */
  annotations?: BoardAnnotations | null;
  /**
   * Enables interactive move input — click-to-move + pointer-based drag.
   * When provided:
   * - Clicking an own-color piece selects it; clicking a legal destination
   *   executes the move. Clicking an empty / opponent / illegal square
   *   deselects (or reselects if it's another own piece).
   * - Pressing on an own-color piece and dragging lifts it (as a DOM element
   *   following the cursor — see {@link useBoardDragDrop}); releasing on
   *   a legal destination executes the move.
   * - The selected square and the legal destinations for the selected piece
   *   are highlighted in the lichess/chessground style (green tint on the
   *   selected square, centered dots on empty targets, corner rings on
   *   captures).
   * - The move is pre-validated against the current FEN; `san` is the
   *   canonical algebraic notation. Promotions default to queen — pass
   *   an underpromotion explicitly via `findLegalMoveByCoords` from the
   *   chess-core if you need that escape hatch.
   *
   * Pointer events cover touch natively, so touch users get the same drag;
   * a tap that doesn't move falls through to click-to-move.
   *
   * Mutually exclusive with `onSquareClick` in spirit — callers wanting
   * raw click capture (e.g. coordinate-quiz) keep using `onSquareClick`;
   * game-play boards use `onMove`. If both are supplied, `onMove` wins
   * for click handling.
   */
  onMove?: (san: string) => void;
  /**
   * Fired once per illegal move *attempt* in interactive mode. Without it
   * the board only ever emits *legal* moves (via `onMove`), so illegal board
   * attempts go entirely unrecorded; wiring it lets always-visible games
   * count blindfold mistakes the same way the text / select / button input
   * paths do. What counts depends on whether obfuscation is active (discs /
   * single-color / hidden pieces) — see {@link obfuscated}:
   *
   * - Obfuscated: the player can't tell pieces apart, so counting is
   *   aggressive. A first click / drag onto the *opponent's* piece (believed
   *   to be one's own) counts; once a piece is selected, ANY non-legal target
   *   counts — illegal square, capturing one's own piece, an uncapturable
   *   opponent, or an (absolutely-pinned) piece the engine rejects. There is
   *   no reselect idiom. An empty-square *first* click is NOT counted (it is
   *   indistinguishable from a misclick / deselect).
   * - Normal display: the lichess / chess.com idiom holds — clicking another
   *   own piece reselects (not counted); only an illegal empty / opponent
   *   destination after a selection counts.
   *
   * Drag-and-drop always counts a drop onto a non-legal square in either mode.
   */
  onIllegalMove?: () => void;
  /**
   * Which pieces the user may pick up in interactive mode (drag / tap / click
   * selection):
   * - `'own'` (default): only the `playerSide` color responds. This is the
   *   correct rule for a real game — tapping or lifting the opponent's pieces
   *   does nothing.
   * - `'side-to-move'`: whichever color is to move in the current FEN responds.
   *   Used by the recall screen, where the reviewer enters BOTH sides'
   *   moves and therefore must be able to grab the opponent's pieces on the
   *   opponent's turn.
   *
   * This ONLY changes the interactivity gate. Piece *visibility* and
   * appearance (`showOwnPieces` / `showOpponentPieces`, circle / single-color
   * obfuscation) stay tied to `playerSide` — the blindfold perspective is
   * unchanged regardless of this setting.
   */
  movablePieces?: 'own' | 'side-to-move';
  /**
   * Render a non-interactive "as if this square were selected" preview: the
   * square gets the selected tint and — when `showPieceDestinations` is on and
   * piece identity isn't hidden — its legal destinations render as move dots,
   * exactly what tapping the piece would show, but without wiring `onMove`.
   * Used by the settings BoardPreview to demonstrate the Piece destinations
   * toggle. Ignored in interactive mode (a real selection takes over).
   */
  previewSelection?: string | null;
};

export const ChessBoard = memo(function ChessBoard({
  fen,
  flipped = false,
  playerSide = 'white',
  lastMove = null,
  onSquareClick,
  highlightedSquares = EMPTY_HIGHLIGHTED_SQUARES,
  showCoordinates = true,
  showOwnPieces = true,
  showOpponentPieces = true,
  showPieceDestinations = true,
  pieceShapeMode = 'normal',
  pieceColors = 'normal',
  pawnHideMode = 'none',
  hiddenPieceStyle = 'absent',
  boardTheme = DEFAULT_BOARD_THEME,
  rounded = true,
  evaluationMark = null,
  className = '',
  annotations = null,
  onMove,
  onIllegalMove,
  movablePieces = 'own',
  previewSelection = null,
}: Props) {
  const themeColors = getBoardThemeColors(boardTheme);
  const interactive = onMove !== undefined;
  // `ownColorChar` drives piece *visibility / appearance* (the blindfold
  // perspective) and never changes. `movableColorChar` drives the
  // *interactivity* gate: own color by default, or the side to move when the
  // caller opts into 'side-to-move' (recall). They are identical in the
  // default 'own' mode, so real games are entirely unaffected.
  const ownColorChar = playerSide.charAt(0);
  const movableColorChar =
    movablePieces === 'side-to-move' ? (fen.split(' ')[1] === 'b' ? 'b' : 'w') : ownColorChar;

  // True when any blindfold obfuscation is active: pieces shown as discs,
  // forced to a single color, or hidden. Used to decide when illegal-move
  // attempts become possible and worth recording via `onIllegalMove`. With
  // normal display, illegal attempts are essentially impossible anyway.
  const obfuscated =
    pieceShapeMode !== 'normal' ||
    pieceColors !== 'normal' ||
    pawnHideMode !== 'none' ||
    !showOwnPieces ||
    !showOpponentPieces;

  // Whether showing legal destinations would leak information the player is
  // meant not to have. This is a strict subset of `obfuscated`: the
  // destination dots reveal a piece's identity only when its *shape* is hidden
  // (stones) or pieces are hidden (a capture ring would expose a hidden
  // opponent). Single-color recolouring keeps every shape intact, so
  // destinations are safe to show there — hence `pieceColors` is excluded.
  const destinationsObscured =
    pieceShapeMode !== 'normal' || pawnHideMode !== 'none' || !showOwnPieces || !showOpponentPieces;

  const board = useMemo(() => {
    try {
      return fenToBoard(fen);
    } catch (error) {
      console.error('Invalid FEN:', error);
      // Return empty board on error
      return Array(8)
        .fill(null)
        .map(() => Array(8).fill(null)) as BoardPiece[][];
    }
  }, [fen]);

  // Selected square for click-to-move (and for the in-flight drag source).
  // Cleared whenever the position changes so a freshly applied move (or a
  // navigation jump) does not leave a stale selection ring on the board.
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Pending promotion choice. Populated when the player attempts a move
  // whose (from, to) pair has multiple legal candidates (one per promotion
  // piece). While set, the promotion picker is overlaid on the board and
  // the actual onMove emit is deferred until the player picks a piece.
  const [promotionPending, setPromotionPending] = useState<{
    from: string;
    to: string;
    candidates: MoveResult[];
  } | null>(null);

  const clearSelection = useCallback(() => setSelectedSquare(null), []);

  // Clear the click-selection / promotion when the position changes underneath
  // it. The in-flight drag is reset by `useBoardDragDrop`, which is also keyed
  // on `fen`.
  useEffect(() => {
    setSelectedSquare(null);
    setPromotionPending(null);
  }, [fen]);

  const pieceAt = useCallback(
    (square: string): BoardPiece | null => {
      if (square.length !== 2) return null;
      const fileIndex = square.charCodeAt(0) - 'a'.charCodeAt(0);
      const rankNum = Number.parseInt(square[1], 10);
      if (Number.isNaN(rankNum) || rankNum < 1 || rankNum > 8) return null;
      if (fileIndex < 0 || fileIndex > 7) return null;
      const rankIndex = 8 - rankNum;
      return board[rankIndex]?.[fileIndex] ?? null;
    },
    [board]
  );

  // Attempt to complete a move from `from` to `to`. Branches by candidate
  // count: 0 = illegal (no-op + clear selection), 1 = fire onMove
  // immediately, >1 = promotion ambiguity, defer onMove and surface the
  // picker.
  const attemptMove = useCallback(
    (from: string, to: string) => {
      if (!onMove) return;
      const candidates = findLegalMovesByCoords(fen, from, to);
      if (candidates.length === 0) {
        // A drag-and-drop onto a non-legal square (including a drop onto an
        // own piece — you cannot capture your own) is an explicit, deliberate
        // attempt, so it always counts as one illegal move.
        onIllegalMove?.();
        setSelectedSquare(null);
        return;
      }
      if (candidates.length === 1) {
        onMove(candidates[0].san);
        setSelectedSquare(null);
        return;
      }
      setPromotionPending({ from, to, candidates });
      setSelectedSquare(null);
    },
    [onMove, fen, onIllegalMove]
  );

  // Pointer-based dragging (replaces HTML5 native DnD). See useBoardDragDrop.
  const { dragFrom, dragSize, handleBoardPointerDown, floatingRef, consumeTrailingClick } =
    useBoardDragDrop({
      enabled: interactive,
      fen,
      movableColorChar,
      pieceAt,
      attemptMove,
      clearSelection,
    });

  // The square whose legal moves should be shown / whose piece is "active":
  // the drag source while dragging, otherwise the click-selected square. Falls
  // back to `previewSelection` so a non-interactive preview board can render
  // an "as if tapped" selection + destinations (the interactive sources are
  // only ever set when `onMove` is wired, so this never collides with a real
  // selection).
  const moveSource = dragFrom ?? selectedSquare ?? previewSelection;

  // Legal destinations for the active source (drag source or click selection).
  // Used to highlight reachable squares. Empty when nothing is active, when
  // interactive mode is off, or when obfuscation hides piece identity.
  const legalDestinations = useMemo<string[]>(() => {
    // Computed for interactive boards (real selection / drag) and for the
    // static `previewSelection` case; suppressed when the dots would leak
    // piece identity (see `destinationsObscured`) or when the user turned
    // destinations off.
    if (
      (!interactive && !previewSelection) ||
      !moveSource ||
      destinationsObscured ||
      !showPieceDestinations
    )
      return [];
    try {
      const moves = getLegalMoves(fen, { verbose: true });
      return moves.filter((m) => m.from === moveSource).map((m) => m.to);
    } catch {
      return [];
    }
  }, [fen, moveSource, interactive, previewSelection, destinationsObscured, showPieceDestinations]);

  const renderPiece = useCallback(
    (piece: BoardPiece, square: string, floating = false) => {
      if (!piece) return null;

      // A piece hidden by the blindfold settings renders as an empty square by
      // default (`'absent'`), or — on the review's "As Played" toggle — as a
      // faint ghost of the true piece so the reviewer sees what was concealed.
      // The ghost deliberately shows the real type/colour (no shape/colour
      // obfuscation) and carries no drag/fade chrome (the review board is
      // read-only).
      const hidden =
        hiddenPieceStyle === 'ghost' ? (
          <div className="flex h-[80%] w-[80%] items-center justify-center opacity-40">
            <ChessPiece type={piece.type} color={piece.color} size={45} />
          </div>
        ) : null;

      // Check if piece should be shown based on settings
      const isOwnPiece = piece.color === ownColorChar;
      if (isOwnPiece && !showOwnPieces) return hidden;
      if (!isOwnPiece && !showOpponentPieces) return hidden;

      // Partial blindfold: hide pawns of the configured side(s) entirely. Runs
      // after the whole-side visibility gate (a hidden side is already gone) and
      // before the shape/color transforms (a hidden pawn renders nothing at all).
      if (piece.type === 'p') {
        const hidePawn =
          pawnHideMode === 'all' ||
          (pawnHideMode === 'own' && isOwnPiece) ||
          (pawnHideMode === 'opponent' && !isOwnPiece);
        if (hidePawn) return hidden;
      }

      // Determine if piece should be shown as circle
      const shouldShowAsCircle =
        pieceShapeMode === 'circles-all' ||
        (pieceShapeMode === 'circles-own' && isOwnPiece) ||
        (pieceShapeMode === 'circles-opponent' && !isOwnPiece);

      // Determine piece color based on settings
      let displayColor = piece.color;
      if (pieceColors === 'white-only') {
        displayColor = 'w';
      } else if (pieceColors === 'black-only') {
        displayColor = 'b';
      }

      // Own pieces are draggable in interactive mode via pointer events (see
      // handleBoardPointerDown). `touch-none` lets a touch drag start on a
      // piece without the page scrolling; empty squares keep normal
      // touch-action so the page still scrolls when touched there. The source
      // square's piece fades while its copy is being dragged (chessground
      // does the same); the floating copy itself (`floating`) never fades.
      // Draggability follows `movableColorChar` (own color by default), NOT
      // `isOwnPiece` — so recall can lift the opponent's pieces on the
      // opponent's turn while visibility stays tied to the player's side.
      const isInteractivePiece = interactive && piece.color === movableColorChar;
      const grabClass = isInteractivePiece ? 'cursor-grab active:cursor-grabbing touch-none' : '';
      const fadeClass = !floating && square === dragFrom ? 'opacity-30' : '';

      if (shouldShowAsCircle) {
        // Show as Go stone-like circle with subtle gradient and shadow
        if (displayColor === 'w') {
          return (
            <div
              className={`w-[60%] h-[60%] rounded-full ${grabClass} ${fadeClass}`}
              style={{
                background:
                  'radial-gradient(ellipse at 30% 30%, #ffffff 0%, #e8e8e8 50%, #d0d0d0 100%)',
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(0, 0, 0, 0.1)',
              }}
            />
          );
        } else {
          return (
            <div
              className={`w-[60%] h-[60%] rounded-full ${grabClass} ${fadeClass}`}
              style={{
                background:
                  'radial-gradient(ellipse at 30% 30%, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)',
                boxShadow:
                  '2px 2px 4px rgba(0, 0, 0, 0.4), inset -1px -1px 3px rgba(255, 255, 255, 0.1)',
              }}
            />
          );
        }
      }

      // Show normal piece
      return (
        <div
          className={`w-[80%] h-[80%] flex items-center justify-center ${grabClass} ${fadeClass}`}
        >
          <ChessPiece type={piece.type} color={displayColor} size={45} />
        </div>
      );
    },
    [
      interactive,
      ownColorChar,
      movableColorChar,
      showOwnPieces,
      showOpponentPieces,
      pieceShapeMode,
      pieceColors,
      pawnHideMode,
      hiddenPieceStyle,
      dragFrom,
    ]
  );

  // Click-to-move state machine. Runs only in interactive mode; when the
  // caller wires `onSquareClick` instead, raw clicks are forwarded
  // unchanged below.
  const handleInteractiveClick = useCallback(
    (square: string) => {
      if (!onMove) return;
      const piece = pieceAt(square);
      // "Movable" = a piece the user is allowed to pick up here: own color in
      // a real game, or the side to move in recall. Selection/reselection
      // and the obfuscated mis-grab counting all key off this, not visibility.
      const clickedMovable = piece !== null && piece.color === movableColorChar;
      const clickedNonMovable = piece !== null && piece.color !== movableColorChar;

      if (selectedSquare === null) {
        if (clickedMovable) {
          setSelectedSquare(square);
        } else if (obfuscated && clickedNonMovable) {
          // Blindfold modes: the player cannot tell the pieces apart, so
          // trying to pick up the opponent's piece (believing it to be their
          // own) is a genuine illegal-move attempt — count it. An empty-square
          // first click is deliberately NOT counted: it is indistinguishable
          // from a misclick or a deselect tap.
          onIllegalMove?.();
        }
        return;
      }

      if (selectedSquare === square) {
        // Toggle off — click on the currently-selected square deselects.
        setSelectedSquare(null);
        return;
      }

      // Try to complete a move from the selected square to here.
      const candidates = findLegalMovesByCoords(fen, selectedSquare, square);
      if (candidates.length > 0) {
        if (candidates.length === 1) {
          onMove(candidates[0].san);
        } else {
          setPromotionPending({ from: selectedSquare, to: square, candidates });
        }
        setSelectedSquare(null);
        return;
      }

      // Not a legal destination.
      if (obfuscated) {
        // Blindfold modes: a piece is already selected, so ANY click that is
        // not its legal destination is a deliberate illegal-move attempt —
        // an illegal square, capturing one's own piece, an uncapturable
        // opponent piece, or moving an (absolutely-pinned) piece the engine
        // rejects. There is no reselect idiom here — the player can't pick
        // pieces apart visually — so the mistake is counted and the
        // selection cleared; the next click starts a fresh selection.
        onIllegalMove?.();
        setSelectedSquare(null);
        return;
      }

      // Normal display: keep the lichess / chess.com idiom. Clicking another
      // movable piece reselects (not a mistake); a click onto an empty / other
      // square is a genuine illegal attempt, so count it and deselect.
      if (!clickedMovable) onIllegalMove?.();
      setSelectedSquare(clickedMovable ? square : null);
    },
    [onMove, fen, movableColorChar, pieceAt, selectedSquare, onIllegalMove, obfuscated]
  );

  const handleBoardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // A drag emits a trailing synthetic click on pointerup — swallow it so
      // it doesn't double as a click-to-move action.
      if (consumeTrailingClick()) return;
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-square]');
      const square = target?.dataset.square;
      if (!square) return;
      if (onMove) {
        handleInteractiveClick(square);
      } else if (onSquareClick) {
        onSquareClick(square);
      }
    },
    [onSquareClick, onMove, handleInteractiveClick, consumeTrailingClick]
  );

  const renderSquare = useCallback(
    ({ square, fileIndex, rankIndex }: SquareRenderInfo) => {
      const piece = board[rankIndex][fileIndex];
      return renderPiece(piece, square);
    },
    [board, renderPiece]
  );

  const squareProps = useCallback(
    ({ square }: SquareRenderInfo) => {
      const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
      const isExternalHighlight = highlightedSquares.includes(square);
      // The active source is the drag source while dragging, else the
      // click-selected square — both get the "selected" tint.
      const isSelected = moveSource === square;
      const isLegalDestination = legalDestinations.includes(square);
      // A legal destination is a capture when the target square is occupied
      // (chessground's `.oc` modifier). En-passant lands on an empty square,
      // so it correctly renders as a plain move-dest dot — matching lichess.
      const isCaptureDest = isLegalDestination && pieceAt(square) !== null;

      // Move affordances mirror lichess/chessground: the selected square and
      // legal-destination dots / capture rings take precedence over the
      // last-move and external-highlight chrome. `last-move` and `selectable`
      // keep their existing ring styling (shared with non-interactive boards).
      const highlightType:
        | 'none'
        | 'last-move'
        | 'selectable'
        | 'selected'
        | 'move-dest'
        | 'capture-dest' = isSelected
        ? 'selected'
        : isCaptureDest
          ? 'capture-dest'
          : isLegalDestination
            ? 'move-dest'
            : isLastMove
              ? 'last-move'
              : isExternalHighlight
                ? 'selectable'
                : 'none';

      const showEvalMark = evaluationMark && evaluationMark.square === square;
      const evalBadge = showEvalMark
        ? getEvaluationIcon(evaluationMark.loss, evaluationMark.isMate)
        : undefined;

      return {
        dataSquare: onSquareClick || interactive ? square : undefined,
        highlightType,
        badge: evalBadge,
      };
    },
    [
      lastMove,
      highlightedSquares,
      evaluationMark,
      onSquareClick,
      interactive,
      moveSource,
      legalDestinations,
      pieceAt,
    ]
  );

  // Resolve the destination square's coords for the promotion picker. The
  // picker stays inside the board's relative container via BoardLayout's
  // overlay slot, so it shares the same coordinate space as the squares.
  const promotionOverlay = (() => {
    if (!promotionPending || !onMove) return null;
    const { to } = promotionPending;
    const fileIndex = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const rankIndex = 8 - Number.parseInt(to[1], 10);
    return (
      <PromotionPicker
        fileIndex={fileIndex}
        rankIndex={rankIndex}
        flipped={flipped}
        promotingColor={movableColorChar === 'b' ? 'b' : 'w'}
        onSelect={(type) => {
          const chosen = promotionPending.candidates.find((m) => m.promotion === type);
          if (chosen) onMove(chosen.san);
          setPromotionPending(null);
        }}
        onCancel={() => setPromotionPending(null)}
      />
    );
  })();

  // Floating piece that follows the cursor during a drag. Rendered into a
  // body portal so it is never clipped by the board's `overflow-hidden` and
  // sits above page chrome. `pointer-events: none` keeps the element under
  // the cursor hit-testable on drop. Position is seeded on mount from the
  // latest pointer coords (via `floatingRef`) and then updated imperatively
  // per pointermove inside the drag hook.
  const dragPiece = (() => {
    if (dragFrom === null || dragSize === null || typeof document === 'undefined') return null;
    const fileIndex = dragFrom.charCodeAt(0) - 'a'.charCodeAt(0);
    const rankIndex = 8 - Number.parseInt(dragFrom[1], 10);
    const piece = board[rankIndex]?.[fileIndex] ?? null;
    if (!piece) return null;
    return createPortal(
      <div
        aria-hidden
        ref={floatingRef}
        className="pointer-events-none fixed z-[1000] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ width: dragSize, height: dragSize }}
      >
        {renderPiece(piece, dragFrom, true)}
      </div>,
      document.body
    );
  })();

  return (
    <>
      <BoardLayout
        flipped={flipped}
        showCoordinates={showCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
        squareProps={squareProps}
        onBoardClick={onSquareClick || interactive ? handleBoardClick : undefined}
        onBoardPointerDown={interactive ? handleBoardPointerDown : undefined}
        rounded={rounded}
        className={className}
        annotations={annotations}
        overlay={promotionOverlay}
      />
      {dragPiece}
    </>
  );
});
