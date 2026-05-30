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
   * Enables interactive move input — click-to-move + HTML5 drag-and-drop.
   * When provided:
   * - Clicking an own-color piece selects it; clicking a legal destination
   *   executes the move. Clicking an empty / opponent / illegal square
   *   deselects (or reselects if it's another own piece).
   * - Own-color pieces become `draggable`; drop on a legal destination
   *   executes the move.
   * - The selected square and the legal destinations for the selected piece
   *   are highlighted in the lichess/chessground style (green tint on the
   *   selected square, centered dots on empty targets, corner rings on
   *   captures).
   * - The move is pre-validated against the current FEN; `san` is the
   *   canonical algebraic notation. Promotions default to queen — pass
   *   an underpromotion explicitly via `findLegalMoveByCoords` from the
   *   chess-core if you need that escape hatch.
   *
   * Touch users fall through to click-to-move naturally: HTML5 native
   * drag rarely fires on touch, but click events do, so the same callback
   * still works.
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
  pieceShapeMode = 'normal',
  pieceColors = 'normal',
  boardTheme = DEFAULT_BOARD_THEME,
  rounded = true,
  evaluationMark = null,
  className = '',
  annotations = null,
  onMove,
  onIllegalMove,
}: Props) {
  const themeColors = getBoardThemeColors(boardTheme);
  const interactive = onMove !== undefined;
  const ownColorChar = playerSide.charAt(0);

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

  useEffect(() => {
    setSelectedSquare(null);
    setPromotionPending(null);
  }, [fen]);

  // Legal destinations for the selected piece. Used to highlight reachable
  // squares AND to validate clicks/drops before firing onMove. Empty when
  // no square is selected or when interactive mode is off.
  const legalDestinations = useMemo<string[]>(() => {
    if (!interactive || !selectedSquare || obfuscated) return [];
    try {
      const moves = getLegalMoves(fen, { verbose: true });
      return moves.filter((m) => m.from === selectedSquare).map((m) => m.to);
    } catch {
      return [];
    }
  }, [fen, selectedSquare, interactive, obfuscated]);

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
    (piece: BoardPiece) => {
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

      // Own pieces become draggable in interactive mode. Drag events fire
      // from this wrapper and bubble up to the board container, where the
      // `[data-square]` ancestor lookup recovers the source square. Touch
      // input falls through to click-to-move (HTML5 native DnD does not
      // start on tap in most browsers).
      const isDraggable = interactive && isOwnPiece;
      const grabClass = isDraggable ? 'cursor-grab active:cursor-grabbing' : '';

      if (shouldShowAsCircle) {
        // Show as Go stone-like circle with subtle gradient and shadow
        if (displayColor === 'w') {
          return (
            <div
              draggable={isDraggable || undefined}
              className={`w-[60%] h-[60%] rounded-full ${grabClass}`}
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
              draggable={isDraggable || undefined}
              className={`w-[60%] h-[60%] rounded-full ${grabClass}`}
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
          draggable={isDraggable || undefined}
          className={`w-[80%] h-[80%] flex items-center justify-center ${grabClass}`}
        >
          <ChessPiece type={piece.type} color={displayColor} size={45} />
        </div>
      );
    },
    [interactive, ownColorChar, showOwnPieces, showOpponentPieces, pieceShapeMode, pieceColors]
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
      const clickedOwn = piece !== null && piece.color === ownColorChar;
      const clickedOpponent = piece !== null && piece.color !== ownColorChar;

      if (selectedSquare === null) {
        if (clickedOwn) {
          setSelectedSquare(square);
        } else if (obfuscated && clickedOpponent) {
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
      // own piece reselects (not a mistake); a click onto an empty / opponent
      // square is a genuine illegal attempt, so count it and deselect.
      if (!clickedOwn) onIllegalMove?.();
      setSelectedSquare(clickedOwn ? square : null);
    },
    [onMove, fen, ownColorChar, pieceAt, selectedSquare, onIllegalMove, obfuscated]
  );

  const handleBoardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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

  const handleBoardDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!onMove) return;
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-square]');
      const square = target?.dataset.square;
      if (!square) {
        e.preventDefault();
        return;
      }
      const piece = pieceAt(square);
      if (!piece || piece.color !== ownColorChar) {
        // Only own-color pieces can drag. The `draggable` flag on
        // renderPiece already guards this, but the preventDefault here
        // is defensive against any future change that loosens it.
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', square);
      setSelectedSquare(square);
    },
    [onMove, ownColorChar, pieceAt]
  );

  const handleBoardDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!onMove) return;
      // preventDefault is REQUIRED on every drag-over for drop to fire.
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    [onMove]
  );

  const handleBoardDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!onMove) return;
      e.preventDefault();
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-square]');
      const targetSquare = target?.dataset.square;
      const sourceSquare = e.dataTransfer.getData('text/plain') || selectedSquare;
      if (!targetSquare || !sourceSquare || sourceSquare === targetSquare) {
        setSelectedSquare(null);
        return;
      }
      attemptMove(sourceSquare, targetSquare);
    },
    [onMove, selectedSquare, attemptMove]
  );

  const renderSquare = useCallback(
    ({ fileIndex, rankIndex }: SquareRenderInfo) => {
      const piece = board[rankIndex][fileIndex];
      return renderPiece(piece);
    },
    [board, renderPiece]
  );

  const squareProps = useCallback(
    ({ square }: SquareRenderInfo) => {
      const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
      const isExternalHighlight = highlightedSquares.includes(square);
      const isSelected = selectedSquare === square;
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
      selectedSquare,
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
        promotingColor={ownColorChar === 'b' ? 'b' : 'w'}
        onSelect={(type) => {
          const chosen = promotionPending.candidates.find((m) => m.promotion === type);
          if (chosen) onMove(chosen.san);
          setPromotionPending(null);
        }}
        onCancel={() => setPromotionPending(null)}
      />
    );
  })();

  return (
    <BoardLayout
      flipped={flipped}
      showCoordinates={showCoordinates}
      themeColors={themeColors}
      renderSquare={renderSquare}
      squareProps={squareProps}
      onBoardClick={onSquareClick || interactive ? handleBoardClick : undefined}
      onBoardDragStart={interactive ? handleBoardDragStart : undefined}
      onBoardDragOver={interactive ? handleBoardDragOver : undefined}
      onBoardDrop={interactive ? handleBoardDrop : undefined}
      rounded={rounded}
      className={className}
      annotations={annotations}
      overlay={promotionOverlay}
    />
  );
});
