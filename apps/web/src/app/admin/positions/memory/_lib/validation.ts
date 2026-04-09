import { validateFen } from '@blindfold-chess/features/chess-core';

import type { PositionMutationData } from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate position mutation data before persisting.
 *
 * @returns An error message string if validation fails, or `null` if valid.
 */
export function validatePositionData(data: PositionMutationData): string | null {
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

  if (!UUID_REGEX.test(data.userId.trim())) {
    return 'User ID must be a valid UUID';
  }

  return null;
}
