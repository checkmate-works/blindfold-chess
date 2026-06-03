'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
   * implicitly off when the board is obfuscated (see {@link obfuscated}).
   */
  showPieceDestinations?: boolean;
  pieceShapeMode?: 'normal' | 'circles-all' | 'circles-own' | 'circles-opponent';
  pieceColors?: 'normal' | 'white-only' | 'black-only';
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
   *   following the cursor — see {@link handleBoardPointerDown}); releasing on
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
   *   Used by the postmortem screen, where the reviewer enters BOTH sides'
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
   * the board isn't obfuscated — its legal destinations render as move dots,
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
  // caller opts into 'side-to-move' (postmortem). They are identical in the
  // default 'own' mode, so real games are entirely unaffected.
  const ownColorChar = playerSide.charAt(0);
  const movableColorChar =
    movablePieces === 'side-to-move' ? (fen.split(' ')[1] === 'b' ? 'b' : 'w') : ownColorChar;

  // True when any blindfold obfuscation is active: pieces shown as discs,
  // forced to a single color, or hidden. In these modes the player cannot
  // tell pieces apart, so (a) the legal-destination highlight is suppressed
  // — showing where a selected piece can go would leak its identity — and
  // (b) illegal-move attempts become possible and worth recording via
  // `onIllegalMove`. With normal display the highlight stays (a sighted
  // QoL aid, where illegal attempts are essentially impossible anyway).
  const obfuscated =
    pieceShapeMode !== 'normal' ||
    pieceColors !== 'normal' ||
    !showOwnPieces ||
    !showOpponentPieces;

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

  // Active pointer drag. `null` until a press on an own piece crosses the
  // movement threshold; `from` is the source square and `size` the side
  // length (px) of one square, used to size the floating piece. The piece
  // follows the cursor as a DOM element (see the portal in the render) rather
  // than the browser's translucent HTML5 drag image, so only the piece lifts
  // — matching lichess/chessground. Cleared on drop / cancel / position change.
  const [dragging, setDragging] = useState<{ from: string; size: number } | null>(null);
  const dragFrom = dragging?.from ?? null;
  // The square whose legal moves should be shown / whose piece is "active":
  // the drag source while dragging, otherwise the click-selected square. Falls
  // back to `previewSelection` so a non-interactive preview board can render
  // an "as if tapped" selection + destinations (the interactive sources are
  // only ever set when `onMove` is wired, so this never collides with a real
  // selection).
  const moveSource = dragFrom ?? selectedSquare ?? previewSelection;

  // Drag bookkeeping kept in refs so the window pointer listeners never go
  // stale and never force a re-render on every pointermove.
  const pendingDragRef = useRef<{
    from: string;
    startX: number;
    startY: number;
    size: number;
  } | null>(null);
  // Latest pointer position, used to seed the floating piece on mount.
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // The floating piece element; its left/top are updated imperatively per
  // pointermove to avoid re-rendering the 64-square board on every frame.
  const dragLayerRef = useRef<HTMLDivElement | null>(null);
  // True once a press has become a real drag — drives both the floating piece
  // and the suppression of the synthetic click that follows a drag.
  const didDragRef = useRef(false);
  // Detaches the active window pointer listeners; set while a press is live.
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setSelectedSquare(null);
    setPromotionPending(null);
    // Cancel any in-flight drag when the position changes underneath it.
    pendingDragRef.current = null;
    didDragRef.current = false;
    dragCleanupRef.current?.();
    setDragging(null);
  }, [fen]);

  // Detach lingering window listeners if the board unmounts mid-drag.
  useEffect(() => () => dragCleanupRef.current?.(), []);

  // Legal destinations for the active source (drag source or click selection).
  // Used to highlight reachable squares. Empty when nothing is active, when
  // interactive mode is off, or when obfuscation hides piece identity.
  const legalDestinations = useMemo<string[]>(() => {
    // Computed for interactive boards (real selection / drag) and for the
    // static `previewSelection` case; suppressed when obfuscated (would leak
    // piece identity) or when the user turned destinations off.
    if ((!interactive && !previewSelection) || !moveSource || obfuscated || !showPieceDestinations)
      return [];
    try {
      const moves = getLegalMoves(fen, { verbose: true });
      return moves.filter((m) => m.from === moveSource).map((m) => m.to);
    } catch {
      return [];
    }
  }, [fen, moveSource, interactive, previewSelection, obfuscated, showPieceDestinations]);

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

  const renderPiece = useCallback(
    (piece: BoardPiece, square: string, floating = false) => {
      if (!piece) return null;

      // Check if piece should be shown based on settings
      const isOwnPiece = piece.color === ownColorChar;
      if (isOwnPiece && !showOwnPieces) return null;
      if (!isOwnPiece && !showOpponentPieces) return null;

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
      // `isOwnPiece` — so postmortem can lift the opponent's pieces on the
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
      dragFrom,
    ]
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

  // Click-to-move state machine. Runs only in interactive mode; when the
  // caller wires `onSquareClick` instead, raw clicks are forwarded
  // unchanged below.
  const handleInteractiveClick = useCallback(
    (square: string) => {
      if (!onMove) return;
      const piece = pieceAt(square);
      // "Movable" = a piece the user is allowed to pick up here: own color in
      // a real game, or the side to move in postmortem. Selection/reselection
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
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-square]');
      const square = target?.dataset.square;
      if (!square) return;
      if (onMove) {
        handleInteractiveClick(square);
      } else if (onSquareClick) {
        onSquareClick(square);
      }
    },
    [onSquareClick, onMove, handleInteractiveClick]
  );

  // Pointer-based dragging (replaces HTML5 native DnD). A press on an own
  // piece arms a pending drag; once the pointer moves past a small threshold
  // the piece is lifted as a DOM element that follows the cursor (rendered in
  // a body portal), and the source square's piece fades. Window listeners
  // track the move/up so the gesture survives the pointer leaving the board;
  // hit-testing on release uses the element under the pointer (the floating
  // piece is `pointer-events: none`), which also makes it unit-testable in
  // jsdom. Touch is handled natively by pointer events, so taps still fall
  // through to click-to-move (handleBoardClick) when no drag occurs.
  const DRAG_THRESHOLD_PX = 4;
  const handleBoardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onMove || e.button !== 0) return;
      const square = (e.target as HTMLElement).closest<HTMLElement>('[data-square]')?.dataset
        .square;
      if (!square) return;
      const piece = pieceAt(square);
      // Only movable pieces drag (own color by default; the side to move in
      // postmortem). Other presses (empty square, non-movable piece) fall
      // through to the click handler, preserving click-to-move and the
      // obfuscated "tried to grab the wrong piece" counting.
      if (!piece || piece.color !== movableColorChar) return;

      const size = e.currentTarget.getBoundingClientRect().width / 8;
      pendingDragRef.current = { from: square, startX: e.clientX, startY: e.clientY, size };
      dragPosRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;

      const onPointerMove = (ev: PointerEvent) => {
        const pending = pendingDragRef.current;
        if (!pending) return;
        dragPosRef.current = { x: ev.clientX, y: ev.clientY };
        if (!didDragRef.current) {
          const dx = ev.clientX - pending.startX;
          const dy = ev.clientY - pending.startY;
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
          // Threshold crossed → start lifting. Drop any click-selection so the
          // drag source is the only highlighted origin.
          didDragRef.current = true;
          setSelectedSquare(null);
          setDragging({ from: pending.from, size: pending.size });
        } else if (dragLayerRef.current) {
          dragLayerRef.current.style.left = `${ev.clientX}px`;
          dragLayerRef.current.style.top = `${ev.clientY}px`;
        }
      };
      const onPointerUp = (ev: PointerEvent) => {
        cleanup();
        const pending = pendingDragRef.current;
        pendingDragRef.current = null;
        setDragging(null);
        if (!pending || !didDragRef.current) return; // a plain tap → click handles it
        const to = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-square]')?.dataset
          .square;
        if (to && to !== pending.from) {
          attemptMove(pending.from, to);
        } else {
          setSelectedSquare(null);
        }
        // didDragRef stays true so the trailing synthetic click is suppressed.
      };
      // The OS / browser can abort a gesture (e.g. it decides a touch is a
      // scroll, or a system UI takes over). Tear down without applying a move.
      const onPointerCancel = () => {
        cleanup();
        pendingDragRef.current = null;
        didDragRef.current = false;
        setDragging(null);
        setSelectedSquare(null);
      };
      const cleanup = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        dragCleanupRef.current = null;
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
      dragCleanupRef.current = cleanup;
    },
    [onMove, movableColorChar, pieceAt, attemptMove]
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
  // latest pointer coords and then updated imperatively per pointermove.
  const dragPiece = (() => {
    if (!dragging || typeof document === 'undefined') return null;
    const fileIndex = dragging.from.charCodeAt(0) - 'a'.charCodeAt(0);
    const rankIndex = 8 - Number.parseInt(dragging.from[1], 10);
    const piece = board[rankIndex]?.[fileIndex] ?? null;
    if (!piece) return null;
    return createPortal(
      <div
        aria-hidden
        ref={(el) => {
          dragLayerRef.current = el;
          if (el) {
            el.style.left = `${dragPosRef.current.x}px`;
            el.style.top = `${dragPosRef.current.y}px`;
          }
        }}
        className="pointer-events-none fixed z-[1000] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ width: dragging.size, height: dragging.size }}
      >
        {renderPiece(piece, dragging.from, true)}
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
