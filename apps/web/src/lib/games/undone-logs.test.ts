import { describe, expect, it } from 'vitest';

import type { MoveOperationLog } from './saved-game-types';
import { isUndoneMoveLog } from './undone-logs';

const VALID_LOG: MoveOperationLog = {
  inputMethod: 'text',
  peekCount: 0,
  undoCount: 1,
  movePeekCount: 0,
};

describe('isUndoneMoveLog', () => {
  it('accepts a well-formed entry with log only', () => {
    expect(isUndoneMoveLog({ index: 0, log: VALID_LOG })).toBe(true);
  });

  it('accepts a well-formed entry with pendingInvalidAttempts only', () => {
    expect(isUndoneMoveLog({ index: 0, pendingInvalidAttempts: ['Nf3'] })).toBe(true);
  });

  it('rejects an entry carrying neither log nor pendingInvalidAttempts', () => {
    expect(isUndoneMoveLog({ index: 0 })).toBe(false);
  });

  it('rejects a negative or non-integer index', () => {
    expect(isUndoneMoveLog({ index: -1, log: VALID_LOG })).toBe(false);
    expect(isUndoneMoveLog({ index: 1.5, log: VALID_LOG })).toBe(false);
  });

  it('accepts a valid sans array alongside log', () => {
    expect(isUndoneMoveLog({ index: 0, log: VALID_LOG, sans: ['Nf3', 'e5'] })).toBe(true);
  });

  it('accepts a legacy entry with no sans field at all', () => {
    expect(isUndoneMoveLog({ index: 0, log: VALID_LOG, sans: undefined })).toBe(true);
  });

  it('rejects a non-string-array sans', () => {
    expect(isUndoneMoveLog({ index: 0, log: VALID_LOG, sans: [42] })).toBe(false);
    expect(isUndoneMoveLog({ index: 0, log: VALID_LOG, sans: 'Nf3' })).toBe(false);
  });

  it('accepts a log whose invalidAttemptSquares mixes {from,to} objects and null slots', () => {
    const withSquares: MoveOperationLog = {
      ...VALID_LOG,
      invalidAttempts: ['Nf3', 'e4'],
      invalidAttemptSquares: [{ from: 'g1', to: 'f3' }, null],
    };
    expect(isUndoneMoveLog({ index: 0, log: withSquares })).toBe(true);
  });

  it('accepts a legacy log with no invalidAttemptSquares field at all', () => {
    expect(isUndoneMoveLog({ index: 0, log: VALID_LOG })).toBe(true);
  });

  it('rejects a log with a malformed invalidAttemptSquares slot', () => {
    const malformed = { ...VALID_LOG, invalidAttemptSquares: [{ from: 'g1' }] };
    expect(isUndoneMoveLog({ index: 0, log: malformed })).toBe(false);
  });
});
