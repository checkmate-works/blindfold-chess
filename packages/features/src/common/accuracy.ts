/**
 * Position accuracy and square-diff utilities for board-recreation practice
 * modules (position-memory, FEN problem). Pure — no DOM, React, Next, or i18n.
 *
 * These helpers compare two FENs square-by-square and produce (a) an
 * `accuracy` score with per-square scoring details and (b) a lightweight
 * per-square status list for board overlay rendering.
 */
import { fenToBoardFlat } from "../chess-core/fen-pure";

export type ScoreDetail = {
  square: string;
  expected: string;
  actual: string;
  score: number;
  description: string;
};

export type PositionAccuracy = {
  correctPieces: number;
  totalPieces: number;
  /** incorrect: a piece from the original position, but placed with a different piece type */
  incorrectPieces: number;
  /** missing: a piece that should be placed but is omitted */
  missingPieces: number;
  /** extra: a piece placed on a square that should remain empty */
  extraPieces: number;
  netScore: number;
  accuracy: number;
  details: ScoreDetail[];
};

export type SquareStatus = "correct" | "incorrect" | "missing";

export type SquareDiff = {
  square: string;
  status: SquareStatus;
};

function indexToSquare(index: number): string {
  const file = String.fromCharCode(97 + (index % 8)); // a-h
  const rank = 8 - Math.floor(index / 8); // 8-1
  return file + rank;
}

function getPieceDescription(
  piece: string,
  pieceNames: Record<string, string>,
): string {
  return pieceNames[piece] || piece;
}

/**
 * Calculate accuracy between original and recreated positions.
 */
export function calculateAccuracy(
  originalFen: string,
  recreatedFen: string,
  pieceNames: Record<string, string>,
  descriptions: {
    correct: (piece: string, square: string) => string;
    wrongPiece: (square: string, expected: string, actual: string) => string;
    missing: (piece: string, square: string) => string;
    extra: (piece: string, square: string) => string;
  },
): PositionAccuracy {
  const originalBoard = fenToBoardFlat(originalFen);
  const recreatedBoard = fenToBoardFlat(recreatedFen);

  let correctPieces = 0;
  let totalPieces = 0;
  let incorrectPieces = 0;
  let missingPieces = 0;
  let extraPieces = 0;
  const details: ScoreDetail[] = [];

  for (let i = 0; i < 64; i++) {
    const originalPiece = originalBoard[i];
    const recreatedPiece = recreatedBoard[i];
    const square = indexToSquare(i);

    if (originalPiece !== "" && recreatedPiece !== "") {
      totalPieces++;
      if (originalPiece === recreatedPiece) {
        correctPieces++;
        details.push({
          square,
          expected: originalPiece,
          actual: recreatedPiece,
          score: 1,
          description: descriptions.correct(
            getPieceDescription(originalPiece, pieceNames),
            square,
          ),
        });
      } else {
        incorrectPieces++;
        details.push({
          square,
          expected: originalPiece,
          actual: recreatedPiece,
          score: -0.5,
          description: descriptions.wrongPiece(
            square,
            getPieceDescription(originalPiece, pieceNames),
            getPieceDescription(recreatedPiece, pieceNames),
          ),
        });
      }
    } else if (originalPiece !== "" && recreatedPiece === "") {
      totalPieces++;
      missingPieces++;
      details.push({
        square,
        expected: originalPiece,
        actual: "",
        score: 0,
        description: descriptions.missing(
          getPieceDescription(originalPiece, pieceNames),
          square,
        ),
      });
    } else if (originalPiece === "" && recreatedPiece !== "") {
      extraPieces++;
      details.push({
        square,
        expected: "",
        actual: recreatedPiece,
        score: -0.5,
        description: descriptions.extra(
          getPieceDescription(recreatedPiece, pieceNames),
          square,
        ),
      });
    }
  }

  const netScore = correctPieces - (incorrectPieces + extraPieces) * 0.5;
  const accuracy =
    totalPieces > 0 ? Math.max(0, (netScore / totalPieces) * 100) : 0;

  return {
    correctPieces,
    totalPieces,
    incorrectPieces,
    missingPieces,
    extraPieces,
    netScore,
    accuracy,
    details,
  };
}

/**
 * Per-square difference status for board overlay rendering.
 */
export function calculateSquareDifferences(
  originalFen: string,
  recreatedFen: string,
): SquareDiff[] {
  const originalBoard = fenToBoardFlat(originalFen);
  const recreatedBoard = fenToBoardFlat(recreatedFen);

  const differences: SquareDiff[] = [];

  for (let i = 0; i < 64; i++) {
    const originalPiece = originalBoard[i];
    const recreatedPiece = recreatedBoard[i];
    const square = indexToSquare(i);

    if (originalPiece !== "" && recreatedPiece !== "") {
      if (originalPiece === recreatedPiece) {
        differences.push({ square, status: "correct" });
      } else {
        differences.push({ square, status: "incorrect" });
      }
    } else if (originalPiece !== "" && recreatedPiece === "") {
      differences.push({ square, status: "missing" });
    } else if (originalPiece === "" && recreatedPiece !== "") {
      differences.push({ square, status: "incorrect" });
    }
  }

  return differences;
}
