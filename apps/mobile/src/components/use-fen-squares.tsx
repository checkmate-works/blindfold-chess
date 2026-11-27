import { useCallback, useMemo } from "react";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import { fenToBoardFlat } from "@blindfold-chess/features/chess-core/fen";
import type { PieceType, Square } from "@blindfold-chess/types";

/**
 * `StaticBoard`'s `renderSquare` for a position given as FEN: every piece
 * drawn on its square, whatever the blindfold preferences say. For picture
 * boards that show a position rather than ask about it (the practice
 * cards' worked examples, an exam's patterns).
 */
export function useFenSquares(
  fen: string,
): (square: Square, size: number) => React.ReactNode {
  const pieces = useMemo(() => fenToBoardFlat(fen), [fen]);
  return useCallback(
    (square: Square, size: number) => {
      const piece =
        pieces[(8 - Number(square[1])) * 8 + square.charCodeAt(0) - 97];
      return piece ? (
        <ChessPieceIcon
          type={piece.toLowerCase() as PieceType}
          color={piece === piece.toUpperCase() ? "w" : "b"}
          size={size}
        />
      ) : null;
    },
    [pieces],
  );
}
