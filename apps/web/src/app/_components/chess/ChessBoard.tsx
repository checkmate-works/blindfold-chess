'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { ChessPiece } from '@/app/_components';
import type {
  BoardClickAction,
  PawnHideMode,
  PieceColor,
  PieceColorMode,
  PieceShapeMode,
} from '@blindfold-chess/features/board-display';
import {
  areDestinationsObscured,
  classifyBoardClick,
  classifyMoveAttempt,
  describeIllegalAttempt,
  resolvePieceDisplay,
  resolveSquareHighlight,
  squareToBoardIndices,
} from '@blindfold-chess/features/board-display';
import type { BoardPiece, MoveResult } from '@blindfold-chess/features/chess-core';
import {
  fenToBoard,
  findLegalMovesByCoords,
  getLegalMoves,
  isBlackToMoveFromFen,
} from '@blindfold-chess/features/chess-core';
import type { Side } from '@blindfold-chess/types';
import { createPortal } from 'react-dom';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { useBoardAnnotationDrawing } from '@/lib/board-annotations/use-board-annotation-drawing';
import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';
import type { EvaluationMark } from '@/lib/games/evaluation';
import { MoveJudgmentBadge } from '@/lib/games/evaluation';
import { goStoneStyle } from '@/lib/games/go-stone-style';
import type { TerminationMark } from '@/lib/games/termination-mark';

import type { SquareRenderInfo } from './BoardLayout';
import { BoardLayout } from './BoardLayout';
import { PromotionPicker } from './PromotionPicker';
import { TerminationMarkBadge } from './TerminationMarkBadge';
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
  /**
   * Mark a rejected move on the board: a red destination square with a ✗, and
   * — when the origin is known — a red outline on the square it came from.
   * Either square may be absent; a text-typed attempt often names only its
   * destination (see `resolveIllegalAttemptSquares`).
   *
   * Read-only chrome for reviewing a finished game, shown in answer to a
   * direct question ("where did this rejected move point?"), so it outranks
   * the last-move tint — see `resolveSquareHighlight`. Same visual language
   * as the "as played" GIF's illegal frames.
   */
  illegalAttempt?: { from?: string; to?: string } | null;
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
  pieceShapeMode?: PieceShapeMode;
  pieceColors?: PieceColorMode;
  /**
   * Partial blindfold: which pawns are hidden entirely (rendered as empty
   * squares). `'none'` (default) shows every pawn; `'all'` hides both sides';
   * `'own'` / `'opponent'` hide only that side's pawns. Orthogonal to
   * `showOwnPieces` / `showOpponentPieces` (which hide whole sides) and to the
   * shape / color obfuscation — a hidden side already hides its pawns, so this
   * only bites on a side that is otherwise shown.
   */
  pawnHideMode?: PawnHideMode;
  /**
   * How pieces hidden by the blindfold settings (`showOwnPieces` /
   * `showOpponentPieces` / `pawnHideMode`) are drawn:
   * - `'absent'` (default) — rendered as an empty square, i.e. truly invisible.
   *   This is what a player must see during live blindfold play.
   * - `'ghost'` — rendered translucently. Used ONLY by the finished-game
   *   review's "As Played" toggle, where fading both conveys what the player
   *   could not see and distinguishes a hidden-occupied square from a
   *   genuinely empty one. A normally-shaped piece fades as its true self so
   *   the reviewer learns what was hidden; a piece the player had set to
   *   render as a Go stone stays a stone and merely fades, since that is
   *   what revealing the square would have shown. See `resolvePieceDisplay`.
   */
  hiddenPieceStyle?: 'absent' | 'ghost';
  boardTheme?: BoardTheme;
  rounded?: boolean;
  /** Move grade to draw on one square (see `MoveJudgmentBadge`). */
  evaluationMark?: EvaluationMark | null;
  /**
   * Accessible name for the grade badge, already localized — same contract as
   * {@link Props.terminationMarkLabel}, since `?!` reads as nothing aloud.
   */
  evaluationMarkLabel?: string;
  className?: string;
  /**
   * Optional pre-parsed display annotations. Passed straight through to
   * {@link BoardLayout}; callers feed JSONB through `parseBoardAnnotations`
   * on the server side first.
   */
  annotations?: BoardAnnotations | null;
  /**
   * Supply alongside `annotations` to make the board a drawing surface: the
   * lichess right-click gesture (right-click a square for a circle, right-click
   * + drag for an arrow, modifiers pick the color, repeating a mark removes
   * it). Each gesture emits the whole next annotation set — the caller owns the
   * state and any persistence.
   *
   * Left-click semantics are untouched: right-button events never fire
   * `onClick`, and the interactive drag ignores anything but the left button,
   * so a board can be playable and drawable at the same time.
   */
  onAnnotationsChange?: (next: BoardAnnotations) => void;
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
   * paths do. What counts is the lichess / chess.com idiom, applied in every
   * display mode (obfuscation — discs / single-color / hidden pieces — does not
   * change it; tapping a piece is a selection regardless of how it's drawn):
   *
   * - Clicking another own piece after a selection reselects it (a change of
   *   which piece to move) — never counted, even when obfuscated.
   * - Only an illegal empty / opponent destination after a selection counts.
   *
   * A *first* tap (nothing selected yet) is never counted — a mis-grabbed
   * opponent piece or an empty square is indistinguishable from a misclick and
   * names no move. Only a completed source → destination attempt counts: a
   * drag-drop always does (it can only start on a movable piece, and a drop
   * onto one's own piece is a committed — if illegal — gesture), and a
   * click-to-move onto an illegal empty / opponent destination does.
   *
   * That attempt is passed as a SAN-like string (`Nf3`, `exd5`) so callers can
   * record *which* move was illegal, matching the text-input path. (The
   * argument is optional only for forward compatibility; every current call
   * site supplies it.) The exact origin/destination squares are passed
   * alongside it — the board always knows both at rejection time, unlike the
   * synthesized label, which deliberately drops disambiguation.
   */
  onIllegalMove?: (attempt?: string, squares?: { from: string; to: string }) => void;
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
  /**
   * End-of-game mark for a finished position: a badge on the losing side's king
   * square naming the reason — `#` for a mate, a flag for a resignation. See
   * `resolveTerminationMark`, which owns the "which square, which kind" rule for
   * every surface that shows a finished game.
   *
   * Caller-supplied rather than derived here: a board renders one position, and
   * only its owner knows whether that position is the game's last (a board
   * scrubbed back through history must not carry the mark).
   */
  terminationMark?: TerminationMark | null;
  /**
   * Accessible name for the termination badge, already localized. Required in
   * practice whenever `terminationMark` is set — this component is used by
   * locale-agnostic surfaces (thumbnails, previews), so the wording stays with
   * the caller rather than pulling `next-intl` in here.
   */
  terminationMarkLabel?: string;
};

export const ChessBoard = memo(function ChessBoard({
  fen,
  flipped = false,
  playerSide = 'white',
  lastMove = null,
  onSquareClick,
  highlightedSquares = EMPTY_HIGHLIGHTED_SQUARES,
  illegalAttempt = null,
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
  evaluationMarkLabel,
  className = '',
  annotations = null,
  onAnnotationsChange,
  onMove,
  onIllegalMove,
  movablePieces = 'own',
  previewSelection = null,
  terminationMark = null,
  terminationMarkLabel = '',
}: Props) {
  const themeColors = getBoardThemeColors(boardTheme);
  const interactive = onMove !== undefined;
  // `ownColorChar` drives piece *visibility / appearance* (the blindfold
  // perspective) and never changes. `movableColorChar` drives the
  // *interactivity* gate: own color by default, or the side to move when the
  // caller opts into 'side-to-move' (recall). They are identical in the
  // default 'own' mode, so real games are entirely unaffected.
  const ownColorChar: PieceColor = playerSide === 'black' ? 'b' : 'w';
  const movableColorChar: PieceColor =
    movablePieces === 'side-to-move' ? (isBlackToMoveFromFen(fen) ? 'b' : 'w') : ownColorChar;

  // The blindfold visibility settings, bundled for the pure display rules in
  // @blindfold-chess/features/board-display (see that module for the policy
  // rationale). Memoized so hooks can depend on it by reference.
  const displaySettings = useMemo(
    () => ({
      ownColor: ownColorChar,
      showOwnPieces,
      showOpponentPieces,
      pieceShapeMode,
      pieceColors,
      pawnHideMode,
      hiddenPieceStyle,
    }),
    [
      ownColorChar,
      showOwnPieces,
      showOpponentPieces,
      pieceShapeMode,
      pieceColors,
      pawnHideMode,
      hiddenPieceStyle,
    ]
  );
  const destinationsObscured = areDestinationsObscured(displaySettings);

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
      const indices = squareToBoardIndices(square);
      if (!indices) return null;
      return board[indices.rankIndex]?.[indices.fileIndex] ?? null;
    },
    [board]
  );

  // Apply a classified input action to the board's React state. The
  // decision of WHAT to do (select / move / count a mistake / ...) lives in
  // the pure click-policy module; this is only the state/callback plumbing.
  const applyClickAction = useCallback(
    (action: BoardClickAction<MoveResult>) => {
      switch (action.type) {
        case 'noop':
          return;
        case 'select':
          setSelectedSquare(action.square);
          return;
        case 'deselect':
          setSelectedSquare(null);
          return;
        case 'illegal-clear': {
          // A real from→to attempt (drag-drop, or click-to-move after a
          // selection): render it as a SAN-like label so the recorder logs
          // which move was rejected, not just a bare count — and pass the
          // exact squares too, since the label alone can't be reversed back
          // into them (no disambiguation for an illegal move).
          const mover = pieceAt(action.from);
          onIllegalMove?.(
            describeIllegalAttempt({
              from: action.from,
              to: action.to,
              moverType: mover?.type ?? null,
              targetOccupied: pieceAt(action.to) !== null,
            }),
            { from: action.from, to: action.to }
          );
          setSelectedSquare(null);
          return;
        }
        case 'move':
          onMove?.(action.move.san);
          setSelectedSquare(null);
          return;
        case 'promotion':
          setPromotionPending({
            from: action.from,
            to: action.to,
            candidates: action.candidates,
          });
          setSelectedSquare(null);
          return;
      }
    },
    [onMove, onIllegalMove, pieceAt]
  );

  // Attempt to complete a move from `from` to `to` (the drag-drop path).
  // Candidate-count branching and the illegal-attempt policy live in
  // classifyMoveAttempt.
  const attemptMove = useCallback(
    (from: string, to: string) => {
      if (!onMove) return;
      applyClickAction(classifyMoveAttempt(from, to, findLegalMovesByCoords(fen, from, to)));
    },
    [onMove, fen, applyClickAction]
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

  // Right-button drawing (arrows / circles). Armed only when the caller passes
  // both `annotations` and `onAnnotationsChange`; otherwise `containerProps` is
  // empty and the browser context menu behaves normally. `handleBoardPointerDown`
  // ignores non-left buttons, so the two gestures coexist on one container.
  const drawing = useBoardAnnotationDrawing({ annotations, onAnnotationsChange, flipped });

  const handleContainerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      drawing.containerProps.onPointerDown?.(e);
      if (interactive) handleBoardPointerDown(e);
    },
    [drawing.containerProps, interactive, handleBoardPointerDown]
  );

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

  // Thin display-descriptor → JSX map. The blindfold visibility decision
  // (absent / ghost / circle / recolored / normal) is made by the pure
  // resolvePieceDisplay; only the markup and the drag chrome live here.
  const renderPiece = useCallback(
    (piece: BoardPiece, square: string, floating = false) => {
      if (!piece) return null;

      const display = resolvePieceDisplay(piece, displaySettings);

      if (display.kind === 'absent') return null;
      if (display.kind === 'ghost') {
        // A ghost carries no drag/fade chrome (the review board is read-only).
        return (
          <div className="flex h-[80%] w-[80%] items-center justify-center opacity-40">
            <ChessPiece type={display.type} color={display.color} size={45} />
          </div>
        );
      }

      // Own pieces are draggable in interactive mode via pointer events (see
      // handleBoardPointerDown). `touch-none` lets a touch drag start on a
      // piece without the page scrolling; empty squares keep normal
      // touch-action so the page still scrolls when touched there. The source
      // square's piece fades while its copy is being dragged (chessground
      // does the same); the floating copy itself (`floating`) never fades.
      // Draggability follows `movableColorChar` (own color by default), NOT
      // the piece's own-ness — so recall can lift the opponent's pieces on the
      // opponent's turn while visibility stays tied to the player's side.
      const isInteractivePiece = interactive && piece.color === movableColorChar;
      const grabClass = isInteractivePiece ? 'cursor-grab active:cursor-grabbing touch-none' : '';
      const fadeClass = !floating && square === dragFrom ? 'opacity-30' : '';

      if (display.kind === 'circle') {
        // Show as Go stone-like circle with subtle gradient and shadow.
        // A faint stone is a hidden one — same fade as a ghost piece, so
        // "dimmed" reads as "could not see this" whichever form it takes.
        return (
          <div
            className={`w-[60%] h-[60%] rounded-full ${display.faint ? 'opacity-40' : ''} ${grabClass} ${fadeClass}`}
            style={goStoneStyle(display.color)}
          />
        );
      }

      return (
        <div
          className={`w-[80%] h-[80%] flex items-center justify-center ${grabClass} ${fadeClass}`}
        >
          <ChessPiece type={display.type} color={display.color} size={45} />
        </div>
      );
    },
    [interactive, movableColorChar, displaySettings, dragFrom]
  );

  // Click-to-move handler. Runs only in interactive mode; when the caller
  // wires `onSquareClick` instead, raw clicks are forwarded unchanged below.
  // The state machine itself — including the blindfold illegal-attempt
  // counting policy — lives in the pure classifyBoardClick.
  const handleInteractiveClick = useCallback(
    (square: string) => {
      if (!onMove) return;
      applyClickAction(
        classifyBoardClick({
          square,
          selectedSquare,
          pieceColor: pieceAt(square)?.color ?? null,
          movableColor: movableColorChar,
          findCandidates: (from, to) => findLegalMovesByCoords(fen, from, to),
        })
      );
    },
    [onMove, fen, movableColorChar, pieceAt, selectedSquare, applyClickAction]
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

      // Move affordances mirror lichess/chessground — precedence lives in the
      // pure resolveSquareHighlight. `last-move` and `selectable` keep their
      // existing ring styling (shared with non-interactive boards).
      const highlightType = resolveSquareHighlight({
        isSelected,
        isCaptureDest,
        isLegalDestination,
        isLastMove: Boolean(isLastMove),
        isExternalHighlight,
        isIllegalTo: illegalAttempt?.to === square,
        isIllegalFrom: illegalAttempt?.from === square,
      });

      const showEvalMark = evaluationMark && evaluationMark.square === square;
      const evalBadge = showEvalMark ? (
        <MoveJudgmentBadge judgment={evaluationMark.judgment} label={evaluationMarkLabel} />
      ) : undefined;

      // The termination badge outranks the move-quality one on the rare square
      // that qualifies for both: how the game ENDED is the more terminal fact,
      // and the mating move's own quality mark still sits on its destination.
      const badge =
        terminationMark?.square === square ? (
          <TerminationMarkBadge kind={terminationMark.kind} label={terminationMarkLabel} />
        ) : (
          evalBadge
        );

      return {
        dataSquare: onSquareClick || interactive ? square : undefined,
        highlightType,
        badge,
      };
    },
    [
      lastMove,
      highlightedSquares,
      illegalAttempt,
      evaluationMark,
      evaluationMarkLabel,
      onSquareClick,
      interactive,
      moveSource,
      legalDestinations,
      pieceAt,
      terminationMark,
      terminationMarkLabel,
    ]
  );

  // Resolve the destination square's coords for the promotion picker. The
  // picker stays inside the board's relative container via BoardLayout's
  // overlay slot, so it shares the same coordinate space as the squares.
  const promotionOverlay = (() => {
    if (!promotionPending || !onMove) return null;
    const indices = squareToBoardIndices(promotionPending.to);
    if (!indices) return null;
    return (
      <PromotionPicker
        fileIndex={indices.fileIndex}
        rankIndex={indices.rankIndex}
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
    const piece = pieceAt(dragFrom);
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
        onBoardPointerDown={
          interactive || drawing.interactive ? handleContainerPointerDown : undefined
        }
        onBoardContextMenu={drawing.containerProps.onContextMenu}
        onBoardPointerUp={drawing.containerProps.onPointerUp}
        containerRef={drawing.interactive ? drawing.containerRef : undefined}
        rounded={rounded}
        className={className}
        annotations={annotations}
        overlay={promotionOverlay}
      />
      {dragPiece}
    </>
  );
});
