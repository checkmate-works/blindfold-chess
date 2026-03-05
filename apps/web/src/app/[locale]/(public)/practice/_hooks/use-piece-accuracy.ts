'use client';

import { useCallback, useMemo } from 'react';

type ScoreDescriptionType = 'correct' | 'wrongPiece' | 'missing' | 'extra';

type AccuracyDescriptions = {
  correct: (piece: string, square: string) => string;
  wrongPiece: (square: string, expected: string, actual: string) => string;
  missing: (piece: string, square: string) => string;
  extra: (piece: string, square: string) => string;
};

const PIECE_KEYS = ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p'] as const;

/**
 * Shared hook that builds translated pieceNames and accuracyDescriptions
 * for use with calculateAccuracy.
 *
 * @param t - A translation function that resolves `pieceNames.<key>` and
 *            `scoreDescriptions.<type>` message keys.
 */
export function usePieceAccuracy(t: (key: string, params?: Record<string, string>) => string): {
  pieceNames: Record<string, string>;
  accuracyDescriptions: AccuracyDescriptions;
} {
  const getScoreDescription = useCallback(
    (type: ScoreDescriptionType, params: Record<string, string>) => {
      return t(`scoreDescriptions.${type}`, params);
    },
    [t]
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
      correct: (piece: string, square: string) => getScoreDescription('correct', { piece, square }),
      wrongPiece: (square: string, expected: string, actual: string) =>
        getScoreDescription('wrongPiece', { square, expected, actual }),
      missing: (piece: string, square: string) => getScoreDescription('missing', { piece, square }),
      extra: (piece: string, square: string) => getScoreDescription('extra', { piece, square }),
    }),
    [getScoreDescription]
  );

  return { pieceNames, accuracyDescriptions };
}
