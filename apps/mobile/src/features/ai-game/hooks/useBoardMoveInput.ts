import { useCallback, useMemo, useState } from "react";
import {
  classifyBoardClick,
  classifyMoveAttempt,
  describeIllegalAttempt,
  squareToBoardIndices,
  type BoardClickAction,
  type MoveSquares,
  type PieceColor,
} from "@blindfold-chess/features/board-display";
import {
  fenToBoard,
  findLegalMovesByCoords,
  getLegalMoves,
  type BoardPiece,
  type MoveResult,
} from "@blindfold-chess/features/chess-core";
import type { PieceType, Square } from "@blindfold-chess/types";

/** A move whose (from, to) pair needs a promotion piece before it is sent. */
export type PendingPromotion = {
  from: Square;
  to: Square;
  candidates: MoveResult[];
};

type Options = {
  fen: string;
  /** The colour the player may pick up. */
  movableColor: PieceColor;
  /**
   * Whether the board takes input right now. Turning it off (the AI's turn,
   * a mask going up) drops any selection or pending promotion.
   */
  enabled: boolean;
  /** One legal move, in SAN. */
  onMove: (san: string) => void;
  /** One completed but illegal from → to attempt, as the web reports it. */
  onIllegalMove?: (attempt: string, squares: MoveSquares) => void;
};

/**
 * Tap-to-move and drag-and-drop on the AI-game board, the web board's
 * `ChessBoard` input rules on top of the same pure policy
 * (`classifyBoardClick` / `classifyMoveAttempt` from
 * `@blindfold-chess/features/board-display`):
 *
 * - a tap on an own piece selects it; a tap on a legal destination plays the
 *   move; a tap on another own piece reselects; a tap on an illegal empty /
 *   opponent square counts one illegal attempt. A first tap never counts.
 * - a drag is a committed from → to gesture: dropped on a legal square it
 *   plays, anywhere else on the board it counts as illegal, and off the
 *   board (or back on its own square) it is cancelled.
 * - a move with several candidates for one (from, to) pair is a promotion:
 *   it waits in `promotion` until the player picks a piece.
 *
 * Selection and promotion belong to the position they were made in, so a
 * new FEN (the player's move, the AI's reply, an undo) drops them without an
 * effect: they are stored with the FEN and read back only while it matches.
 */
export function useBoardMoveInput({
  fen,
  movableColor,
  enabled,
  onMove,
  onIllegalMove,
}: Options) {
  const [selection, setSelection] = useState<{
    fen: string;
    square: Square;
  } | null>(null);
  const [pending, setPending] = useState<{
    fen: string;
    promotion: PendingPromotion;
  } | null>(null);

  const selectedSquare =
    enabled && selection?.fen === fen ? selection.square : null;
  const promotion = enabled && pending?.fen === fen ? pending.promotion : null;

  const board = useMemo<BoardPiece[][] | null>(() => {
    try {
      return fenToBoard(fen);
    } catch {
      return null;
    }
  }, [fen]);

  const pieceAt = useCallback(
    (square: Square): BoardPiece | null => {
      const indices = squareToBoardIndices(square);
      if (!indices || !board) return null;
      return board[indices.rankIndex]?.[indices.fileIndex] ?? null;
    },
    [board],
  );

  const select = useCallback(
    (square: Square | null) =>
      setSelection(square === null ? null : { fen, square }),
    [fen],
  );

  const apply = useCallback(
    (action: BoardClickAction<MoveResult>) => {
      switch (action.type) {
        case "noop":
          return;
        case "select":
          select(action.square);
          return;
        case "deselect":
          select(null);
          return;
        case "illegal-clear": {
          const mover = pieceAt(action.from);
          onIllegalMove?.(
            describeIllegalAttempt({
              from: action.from,
              to: action.to,
              moverType: mover?.type ?? null,
              targetOccupied: pieceAt(action.to) !== null,
            }),
            { from: action.from, to: action.to },
          );
          select(null);
          return;
        }
        case "move":
          select(null);
          onMove(action.move.san);
          return;
        case "promotion":
          select(null);
          setPending({
            fen,
            promotion: {
              from: action.from,
              to: action.to,
              candidates: action.candidates,
            },
          });
          return;
      }
    },
    [fen, onMove, onIllegalMove, pieceAt, select],
  );

  const candidatesFor = useCallback(
    (from: Square, to: Square) => {
      try {
        return findLegalMovesByCoords(fen, from, to);
      } catch {
        return [];
      }
    },
    [fen],
  );

  /** Whether a press on `square` may lift a piece for a drag. */
  const canLift = useCallback(
    (square: Square) =>
      enabled && !promotion && pieceAt(square)?.color === movableColor,
    [enabled, promotion, pieceAt, movableColor],
  );

  const tap = useCallback(
    (square: Square) => {
      if (!enabled || promotion) return;
      apply(
        classifyBoardClick({
          square,
          selectedSquare,
          pieceColor: pieceAt(square)?.color ?? null,
          movableColor,
          findCandidates: candidatesFor,
        }),
      );
    },
    [
      enabled,
      promotion,
      selectedSquare,
      pieceAt,
      movableColor,
      candidatesFor,
      apply,
    ],
  );

  /** A drag has started from `square`: it is the only highlighted origin. */
  const startDrag = useCallback(() => select(null), [select]);

  const drop = useCallback(
    (from: Square, to: Square | null) => {
      if (!enabled || promotion) return;
      if (to === null || to === from) {
        select(null);
        return;
      }
      apply(classifyMoveAttempt(from, to, candidatesFor(from, to)));
    },
    [enabled, promotion, apply, candidatesFor, select],
  );

  const choosePromotion = useCallback(
    (type: PieceType) => {
      const chosen = promotion?.candidates.find((m) => m.promotion === type);
      setPending(null);
      if (chosen) onMove(chosen.san);
    },
    [promotion, onMove],
  );

  const cancelPromotion = useCallback(() => setPending(null), []);

  /** The legal destinations of `source`, for the move dots. */
  const destinationsOf = useCallback(
    (source: Square | null): Square[] => {
      if (!source || !enabled) return [];
      try {
        return getLegalMoves(fen, { verbose: true })
          .filter((m) => m.from === source)
          .map((m) => m.to);
      } catch {
        return [];
      }
    },
    [fen, enabled],
  );

  return {
    selectedSquare,
    promotion,
    pieceAt,
    canLift,
    tap,
    startDrag,
    drop,
    choosePromotion,
    cancelPromotion,
    destinationsOf,
  };
}
