"use client";

import { useCallback, useMemo } from "react";

import { PALETTE_PIECES } from "./board-edit";

type ScoreDescriptionType = "correct" | "wrongPiece" | "missing" | "extra";

export type AccuracyDescriptions = {
  correct: (piece: string, square: string) => string;
  wrongPiece: (square: string, expected: string, actual: string) => string;
  missing: (piece: string, square: string) => string;
  extra: (piece: string, square: string) => string;
};

const PIECE_KEYS = PALETTE_PIECES;

/**
 * Shared hook that builds translated pieceNames and accuracyDescriptions
 * for use with calculateAccuracy.
 *
 * @param t - A translation function that resolves `pieceNames.<key>` and
 *            `scoreDescriptions.<type>` message keys.
 */
export function usePieceAccuracy(
  t: (key: string, params?: Record<string, string>) => string,
): {
  pieceNames: Record<string, string>;
  accuracyDescriptions: AccuracyDescriptions;
} {
  // <ns>.scoreDescriptions.correct / .wrongPiece / .missing / .extra and <ns>.pieceNames.K / .Q / .R / .B / .N / .P / .k / .q / .r / .b / .n / .p (PIECE_KEYS). On the web t is practice.fen (FenSession) or practice.positionMemory (PositionMemorySessionView): practice.fen.scoreDescriptions.correct, practice.fen.pieceNames.K, practice.positionMemory.scoreDescriptions.missing, practice.positionMemory.pieceNames.p, …; on mobile it is fen (the FEN session screen): fen.scoreDescriptions.correct, fen.pieceNames.K, …
  const getScoreDescription = useCallback(
    (type: ScoreDescriptionType, params: Record<string, string>) => {
      return t(`scoreDescriptions.${type}`, params);
    },
    [t],
  );

  const pieceNames = useMemo<Record<string, string>>(() => {
    const names: Record<string, string> = {};
    for (const key of PIECE_KEYS) {
      names[key] = t(`pieceNames.${key}`);
    }
    return names;
  }, [t]);

  const accuracyDescriptions = useMemo<AccuracyDescriptions>(
    () => ({
      correct: (piece: string, square: string) =>
        getScoreDescription("correct", { piece, square }),
      wrongPiece: (square: string, expected: string, actual: string) =>
        getScoreDescription("wrongPiece", { square, expected, actual }),
      missing: (piece: string, square: string) =>
        getScoreDescription("missing", { piece, square }),
      extra: (piece: string, square: string) =>
        getScoreDescription("extra", { piece, square }),
    }),
    [getScoreDescription],
  );

  return { pieceNames, accuracyDescriptions };
}
