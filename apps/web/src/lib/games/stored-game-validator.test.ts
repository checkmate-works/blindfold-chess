import { describe, expect, it } from 'vitest';

import { isValidStoredGame } from './stored-game-validator';

function baseGame(overrides: Record<string, unknown> = {}) {
  return {
    id: 'g1',
    date: '2026-01-01',
    moves: ['e4', 'e5'],
    playerColor: 'white',
    skillLevel: 5,
    status: 'in_progress',
    ...overrides,
  };
}

function log(overrides: Record<string, unknown> = {}) {
  return {
    inputMethod: 'board',
    peekCount: 0,
    undoCount: 0,
    ...overrides,
  };
}

describe('isValidStoredGame — fields the app no longer reads', () => {
  it('accepts a record that still carries a maiaChargeId', () => {
    // Written by Maia games started while they cost a coin. The field is gone
    // from `Game`, but the records are still in players' browsers; rejecting
    // an unknown key would silently drop those saved games.
    expect(
      isValidStoredGame(baseGame({ maiaChargeId: '019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6071' }))
    ).toBe(true);
  });
});

describe('isValidStoredGame — operationLogs.invalidAttemptSquares', () => {
  it('accepts a well-formed stored game with no operationLogs at all', () => {
    expect(isValidStoredGame(baseGame())).toBe(true);
  });

  it('accepts operationLogs with no invalidAttemptSquares field', () => {
    expect(isValidStoredGame(baseGame({ operationLogs: [log()] }))).toBe(true);
  });

  it('accepts a well-formed invalidAttemptSquares array, including null slots', () => {
    expect(
      isValidStoredGame(
        baseGame({
          operationLogs: [
            log({
              invalidAttempts: ['Nf3', 'e4'],
              invalidAttemptSquares: [{ from: 'g1', to: 'f3' }, null],
            }),
          ],
        })
      )
    ).toBe(true);
  });

  it('rejects a non-array invalidAttemptSquares', () => {
    expect(
      isValidStoredGame(baseGame({ operationLogs: [log({ invalidAttemptSquares: 'nope' })] }))
    ).toBe(false);
  });

  it('rejects a slot that is neither null nor a {from,to} object', () => {
    expect(
      isValidStoredGame(baseGame({ operationLogs: [log({ invalidAttemptSquares: ['e2-e4'] })] }))
    ).toBe(false);
    expect(
      isValidStoredGame(
        baseGame({ operationLogs: [log({ invalidAttemptSquares: [{ from: 'e2' }] })] })
      )
    ).toBe(false);
    expect(
      isValidStoredGame(
        baseGame({
          operationLogs: [log({ invalidAttemptSquares: [{ from: 42, to: 'e4' }] })],
        })
      )
    ).toBe(false);
  });
});
