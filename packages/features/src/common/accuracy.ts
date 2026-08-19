/**
 * Position accuracy and square-diff utilities for board-recreation practice
 * modules (position-memory, FEN problem). Pure — no DOM, React, Next, or i18n.
 *
 * These helpers compare two FENs square-by-square and produce (a) an
 * `accuracy` score with per-square scoring details and (b) a lightweight
 * per-square status list for board overlay rendering.
 */
import { boardIndexToSquare, fenToBoardFlat } from "../chess-core/fen-pure";
import { TOTAL_SQUARES } from "./constants";

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

function getPieceDescription(
  piece: string,
  pieceNames: Record<string, string>,
): string {
  return pieceNames[piece] || piece;
}

/** How a single square compares between the original and recreated boards. */
export type SquareClassification =
  "correct" | "wrongPiece" | "missing" | "extra";

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
    result.push({ square: boardIndexToSquare(i), expected, actual, kind });
  }
  return result;
}

type DescriptionBuilders = {
  correct: (piece: string, square: string) => string;
  wrongPiece: (square: string, expected: string, actual: string) => string;
  missing: (piece: string, square: string) => string;
  extra: (piece: string, square: string) => string;
};

/**
 * Per-square score weights. `netScore` is the sum of these over all
 * classified squares, so a weight change here changes the aggregate too —
 * there is no second copy of the rule to keep in sync.
 */
const SQUARE_SCORES: Record<SquareClassification, number> = {
  correct: 1,
  wrongPiece: -0.5,
  missing: 0,
  extra: -0.5,
};

function toScoreDetail(
  { square, expected, actual, kind }: ClassifiedSquare,
  pieceNames: Record<string, string>,
  descriptions: DescriptionBuilders,
): ScoreDetail {
  const describe = (): string => {
    switch (kind) {
      case "correct":
        return descriptions.correct(
          getPieceDescription(expected, pieceNames),
          square,
        );
      case "wrongPiece":
        return descriptions.wrongPiece(
          square,
          getPieceDescription(expected, pieceNames),
          getPieceDescription(actual, pieceNames),
        );
      case "missing":
        return descriptions.missing(
          getPieceDescription(expected, pieceNames),
          square,
        );
      case "extra":
        return descriptions.extra(
          getPieceDescription(actual, pieceNames),
          square,
        );
    }
  };

  return {
    square,
    expected,
    actual,
    score: SQUARE_SCORES[kind],
    description: describe(),
  };
}

/**
 * Calculate accuracy between original and recreated positions.
 */
export function calculateAccuracy(
  originalFen: string,
  recreatedFen: string,
  pieceNames: Record<string, string>,
  descriptions: DescriptionBuilders,
): PositionAccuracy {
  const classified = classifySquares(originalFen, recreatedFen);
  const countOf = (kind: SquareClassification): number =>
    classified.filter((c) => c.kind === kind).length;

  const correctPieces = countOf("correct");
  const incorrectPieces = countOf("wrongPiece");
  const missingPieces = countOf("missing");
  const extraPieces = countOf("extra");
  // Extra pieces sit on squares that are empty in the original, so they are
  // not part of the piece total — they only subtract from the score.
  const totalPieces = correctPieces + incorrectPieces + missingPieces;

  const details = classified.map((c) =>
    toScoreDetail(c, pieceNames, descriptions),
  );
  const netScore = details.reduce((sum, d) => sum + d.score, 0);
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
