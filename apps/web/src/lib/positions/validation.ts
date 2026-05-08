import { validateFen, validateMoveSequence } from '@blindfold-chess/features/chess-core';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';
import { UUID_RE } from '@/lib/validations/uuid';

export const PUZZLE_NOTE_MAX_LENGTH = 280;

export type PositionMutationData = {
  fen: string;
  title: string;
  description?: string | null;
  userId: string;
};

export type PuzzleMutationData = PositionMutationData & {
  solutionMoves: PuzzleSolutionMove[];
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
 * Validate metadata-only puzzle update payloads (title + optional description).
 *
 * Used by the puzzle edit flow, which deliberately does not allow editing
 * `fen` or `solutionMoves` to avoid breaking spoiler-tagged comments and
 * `puzzle_solutions` integrity. Identity (`userId`) is enforced by the
 * server action's ownership check, not here.
 *
 * @returns An error message string if validation fails, or `null` if valid.
 */
export function validatePuzzleMetadataMutationData(data: {
  title: string;
  description?: string | null;
}): string | null {
  if (!data.title || !data.title.trim()) {
    return 'Title is required';
  }
  return null;
}

/**
 * Validate puzzle mutation data before persisting.
 *
 * Extends position validation with solution moves validation.
 *
 * @returns An error message string if validation fails, or `null` if valid.
 */
export function validatePuzzleMutationData(data: PuzzleMutationData): string | null {
  const positionError = validatePositionMutationData(data);
  if (positionError) {
    return positionError;
  }

  if (!data.solutionMoves || data.solutionMoves.length === 0) {
    return 'Solution is required';
  }

  const sanTokens = data.solutionMoves.map((m) => m.san);
  const result = validateMoveSequence(data.fen.trim(), sanTokens);

  if (!result.valid) {
    return result.error ?? 'Invalid move sequence for this position';
  }

  for (const move of data.solutionMoves) {
    if (move.note != null && move.note.length > PUZZLE_NOTE_MAX_LENGTH) {
      return `Each note must be ${PUZZLE_NOTE_MAX_LENGTH} characters or fewer`;
    }
  }

  return null;
}

/**
 * Normalize a raw per-move input array for persistence.
 *
 * Trims each note; empty / whitespace-only notes become `null`. Returns the
 * always-canonical `PuzzleSolutionMove[]` shape (every element carries a
 * `note` field, `null` when absent) to match the JSONB column shape.
 */
export function normalizePuzzleMoves(
  rawMoves: Array<{ san: string; note?: string | null }>
): PuzzleSolutionMove[] {
  return rawMoves.map((m) => {
    // `note?: string | null` accepts both `undefined` (key omitted by the
    // caller) and `null` (explicit-no-note). `apps/web/tsconfig.json` does
    // not enable `exactOptionalPropertyTypes`, so the `?` modifier in the
    // parameter type already admits `undefined` alongside `null`; the
    // `== null` check collapses both to the canonical `note: null` output.
    if (m.note == null) return { san: m.san, note: null };
    const trimmed = m.note.trim();
    return { san: m.san, note: trimmed.length === 0 ? null : trimmed };
  });
}
