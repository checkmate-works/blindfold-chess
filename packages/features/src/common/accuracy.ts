/**
 * Position accuracy and square-diff utilities for board-recreation practice
 * modules (position-memory, FEN problem). Pure — no DOM, React, Next, or i18n.
 *
 * These helpers compare two FENs square-by-square and produce (a) an
 * `accuracy` score with per-square scoring details and (b) a lightweight
 * per-square status list for board overlay rendering.
 */
import { fenToBoardFlat } from "../chess-core/fen-pure";
import { BOARD_LAST_INDEX, BOARD_SIZE, TOTAL_SQUARES } from "./constants";
import { fileRankToSquare } from "./utils";

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
  // index 0 = a8, index 63 = h1 (rank-major, top-down ordering used by FEN board flat)
  return fileRankToSquare(
    index % BOARD_SIZE,
    BOARD_LAST_INDEX - Math.floor(index / BOARD_SIZE),
  );
}

function getPieceDescription(
  piece: string,
  pieceNames: Record<string, string>,
): string {
  return pieceNames[piece] || piece;
}

/** How a single square compares between the original and recreated boards. */
export type SquareClassification =
  | "correct"
  | "wrongPiece"
  | "missing"
  | "extra";

export type ClassifiedSquare = {
  square: string;
  /** Piece on the original board, or "" if that square was empty. */
  expected: string;
  /** Piece on the recreated board, or "" if that square was empty. */
  actual: string;
  kind: SquareClassification;
};

/**
 * Compare two FENs square-by-square and classify every square that holds a
 * piece on at least one of the two boards (squares empty on both are skipped).
 *
 * This is the shared core of `calculateAccuracy` (which adds scoring + i18n
 * descriptions) and `calculateSquareDifferences` (which projects to overlay
 * statuses) — neither re-walks the board itself.
 */
export function classifySquares(
  originalFen: string,
  recreatedFen: string,
): ClassifiedSquare[] {
  const originalBoard = fenToBoardFlat(originalFen);
  const recreatedBoard = fenToBoardFlat(recreatedFen);

  const result: ClassifiedSquare[] = [];
  for (let i = 0; i < TOTAL_SQUARES; i++) {
    const expected = originalBoard[i] ?? "";
    const actual = recreatedBoard[i] ?? "";
    if (expected === "" && actual === "") continue;

    let kind: SquareClassification;
    if (expected !== "" && actual !== "") {
      kind = expected === actual ? "correct" : "wrongPiece";
    } else if (expected !== "") {
      kind = "missing";
    } else {
      kind = "extra";
    }
    result.push({ square: indexToSquare(i), expected, actual, kind });
  }
  return result;
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
  let correctPieces = 0;
  let totalPieces = 0;
  let incorrectPieces = 0;
  let missingPieces = 0;
  let extraPieces = 0;
  const details: ScoreDetail[] = [];

  for (const { square, expected, actual, kind } of classifySquares(
    originalFen,
    recreatedFen,
  )) {
    switch (kind) {
      case "correct":
        totalPieces++;
        correctPieces++;
        details.push({
          square,
          expected,
          actual,
          score: 1,
          description: descriptions.correct(
            getPieceDescription(expected, pieceNames),
            square,
          ),
        });
        break;
      case "wrongPiece":
        totalPieces++;
        incorrectPieces++;
        details.push({
          square,
          expected,
          actual,
          score: -0.5,
          description: descriptions.wrongPiece(
            square,
            getPieceDescription(expected, pieceNames),
            getPieceDescription(actual, pieceNames),
          ),
        });
        break;
      case "missing":
        totalPieces++;
        missingPieces++;
        details.push({
          square,
          expected,
          actual: "",
          score: 0,
          description: descriptions.missing(
            getPieceDescription(expected, pieceNames),
            square,
          ),
        });
        break;
      case "extra":
        extraPieces++;
        details.push({
          square,
          expected: "",
          actual,
          score: -0.5,
          description: descriptions.extra(
            getPieceDescription(actual, pieceNames),
            square,
          ),
        });
        break;
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
  return classifySquares(originalFen, recreatedFen).map(({ square, kind }) => ({
    square,
    // The overlay only distinguishes correct / missing / everything-else;
    // both wrongPiece and extra render as "incorrect".
    status:
      kind === "correct"
        ? "correct"
        : kind === "missing"
          ? "missing"
          : "incorrect",
  }));
}
