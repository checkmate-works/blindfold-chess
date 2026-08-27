import {
  getFenAfterMoves,
  getStartingFen,
  isCheckmateFen,
  validateMoveSequence,
} from '@blindfold-chess/features/chess-core';
import { describe, expect, it } from 'vitest';

import { OPERA_GAME_FINAL_FEN, OPERA_GAME_MOVES } from './opera-game-moves';

// The sample this constant replaced looked plausible and shipped illegal
// (9. Qxc5 crossed three occupied squares), so the score is proven against
// the engine rather than trusted: every move legal, the pre-computed final
// FEN in sync with the move list, and the game actually over.
describe('OPERA_GAME_MOVES', () => {
  it('is a fully legal move sequence from the standard start', () => {
    const result = validateMoveSequence(getStartingFen(), [...OPERA_GAME_MOVES]);

    expect(result.valid).toBe(true);
    // Canonical SAN round-trips unchanged — the article displays these
    // strings verbatim as notation to learn from.
    expect(result.validMoves).toEqual(OPERA_GAME_MOVES);
  });

  it('ends in the pre-computed final position, which is checkmate', () => {
    const finalFen = getFenAfterMoves(getStartingFen(), [...OPERA_GAME_MOVES]);

    expect(finalFen).toBe(OPERA_GAME_FINAL_FEN);
    expect(isCheckmateFen(finalFen)).toBe(true);
  });
});
