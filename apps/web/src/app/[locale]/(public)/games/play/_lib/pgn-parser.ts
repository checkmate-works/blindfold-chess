/**
 * Re-exports from @blindfold-chess/features/chess-core.
 *
 * App-level code should gradually migrate to importing directly from
 * '@blindfold-chess/features/chess-core'. This file remains as a
 * convenience barrel so that existing consumers keep working.
 */
export type { FormattedPgn, FormattedPgnMove } from '@blindfold-chess/features/chess-core';

export {
  formatPgnToText,
  generatePgn,
  getStartingFen,
  getPgnSuggestion,
  parsePgn,
  parsePgnWithFen,
  validateFen,
  validatePgn,
  validatePgnWithDetails,
} from '@blindfold-chess/features/chess-core';
