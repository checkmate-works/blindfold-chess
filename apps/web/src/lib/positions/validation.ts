import { validateFen } from '@blindfold-chess/features/chess-core';

import { UUID_RE } from '@/lib/validations/uuid';

export type PositionMutationData = {
  fen: string;
  title: string;
  description?: string | null;
  userId: string;
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
