import { describe, expect, it } from 'vitest';

import { classifyGuestPromotionQualification } from './guest-promotion';
import type {
  GamePlaySettings,
  MoveOperationLog,
  PreferenceChangeLogEntry,
} from './saved-game-types';

const SIGHTED: GamePlaySettings = {
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

const HIDDEN: GamePlaySettings = { ...SIGHTED, boardVisibility: 'never' };

function opLog(peekCount: number): MoveOperationLog {
  return { inputMethod: 'text', peekCount, undoCount: 0, movePeekCount: 0 };
}

function classify(overrides: Partial<Parameters<typeof classifyGuestPromotionQualification>[0]>) {
  return classifyGuestPromotionQualification({
    result: 'win',
    playSettings: HIDDEN,
    changeLog: undefined,
    operationLogs: [],
    moveCount: 40,
    ...overrides,
  });
}

describe('classifyGuestPromotionQualification', () => {
  it.each(['loss', 'draw', null] as const)('returns null for a %s result', (result) => {
    expect(classify({ result })).toBeNull();
  });

  it('returns null when the settings snapshot is missing', () => {
    expect(classify({ playSettings: null })).toBeNull();
    expect(classify({ playSettings: undefined })).toBeNull();
  });

  it('returns null for a fully sighted win — no constraint at all', () => {
    expect(classify({ playSettings: SIGHTED })).toBeNull();
  });

  it('returns 1dan for a board-hidden win with no peeks', () => {
    expect(classify({})).toBe('1dan');
  });

  it('returns 1dan when total peeks exactly equal the allowance (5)', () => {
    expect(classify({ operationLogs: [opLog(3), opLog(2)] })).toBe('1dan');
  });

  it('downgrades to 1kyu when peeks exceed the allowance', () => {
    expect(classify({ operationLogs: [opLog(4), opLog(2)] })).toBe('1kyu');
  });

  it('returns 1dan for the default peek mode (board hidden, peekable) within the allowance', () => {
    expect(classify({ playSettings: { ...SIGHTED, boardVisibility: 'peek' } })).toBe('1dan');
  });

  it('downgrades to 1kyu when the board was revealed mid-game', () => {
    const changeLog: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 10, key: 'boardVisibility', from: 'never', to: 'always' },
    ];
    expect(classify({ changeLog })).toBe('1kyu');
  });

  it('stays 1dan when mid-game changes never reveal the board', () => {
    const changeLog: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 10, key: 'boardVisibility', from: 'never', to: 'peek' },
      { atMoveIndex: 20, key: 'pieceColors', from: 'normal', to: 'white-only' },
    ];
    expect(classify({ changeLog })).toBe('1dan');
  });

  it('returns 1kyu for a partially constrained win (board visible, pawns hidden)', () => {
    expect(classify({ playSettings: { ...SIGHTED, pawnHideMode: 'all' } })).toBe('1kyu');
  });

  it('tolerates an undefined change log and operation logs', () => {
    expect(classify({ changeLog: undefined, operationLogs: null })).toBe('1dan');
  });
});
