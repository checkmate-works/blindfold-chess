import { validateFen, validateMoveSequence } from '@blindfold-chess/features/chess-core';

import { UUID_RE } from '@/lib/validations/uuid';

export type PositionMutationData = {
  fen: string;
  title: string;
  description?: string | null;
  userId: string;
};

export type PuzzleMutationData = PositionMutationData & {
  solutionLine: string;
};

/**
 * Validate position mutation data before persisting.
 *
 * @returns An error message string if validation fails, or `null` if valid.
 */
export function validatePositionMutationData(data: PositionMutationData): string | null {
  if (!data.fen || !data.fen.trim()) {
    return 'FEN is required';
  }

  if (!validateFen(data.fen.trim())) {
    return 'Invalid FEN — must be a legal chess position';
  }

  if (!data.title || !data.title.trim()) {
    return 'Title is required';
  }

  if (!data.userId || !data.userId.trim()) {
    return 'User ID is required';
  }

  if (!UUID_RE.test(data.userId.trim())) {
    return 'User ID must be a valid UUID';
  }

  return null;
}

/**
 * Validate puzzle mutation data before persisting.
 *
 * Extends position validation with solution line validation.
 *
 * @returns An error message string if validation fails, or `null` if valid.
 */
export function validatePuzzleMutationData(data: PuzzleMutationData): string | null {
  const positionError = validatePositionMutationData(data);
  if (positionError) {
    return positionError;
  }

  if (!data.solutionLine || !data.solutionLine.trim()) {
    return 'Solution is required';
  }

  const moves = data.solutionLine.trim().split(/\s+/);
  const result = validateMoveSequence(data.fen.trim(), moves);

  if (!result.valid) {
    return result.error ?? 'Invalid move sequence for this position';
  }

  return null;
}
