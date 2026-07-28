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
