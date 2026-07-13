import { describe, expect, it } from 'vitest';

import type { StoredGame } from './saved-game-types';
import { normaliseStoredGame } from './stored-game-migration';

function stored(overrides: Partial<StoredGame> = {}): StoredGame {
  return {
    id: 'g1',
    date: '2026-07-13T10:00:00.000Z',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] as StoredGame['moves'],
    playerColor: 'white',
    status: 'win',
    engineConfig: { kind: 'stockfish', skillLevel: 1 },
    ...overrides,
  };
}

describe('normaliseStoredGame — setupPlies', () => {
  it('passes a valid prefix length through', () => {
    expect(normaliseStoredGame(stored({ setupPlies: 3 })).setupPlies).toBe(3);
  });

  it('clamps a prefix longer than the move list (unsaved ratchet state)', () => {
    // An undo into the prefix ratchets the session value but does not itself
    // trigger a save, so a record can briefly say setupPlies=6 with 5 moves.
    expect(normaliseStoredGame(stored({ setupPlies: 6 })).setupPlies).toBe(5);
  });

  it('drops corrupt values to undefined', () => {
    for (const bad of [0, -3, 3.7, NaN, '5', null] as unknown[]) {
      const game = normaliseStoredGame(stored({ setupPlies: bad as number }));
      expect(game.setupPlies).toBeUndefined();
    }
  });

  it('leaves legacy records without the field untouched', () => {
    expect(normaliseStoredGame(stored()).setupPlies).toBeUndefined();
  });
});
