import { describe, expect, it } from 'vitest';

import {
  MAX_DESCRIPTION_LENGTH,
  MAX_MOVES,
  MAX_TITLE_LENGTH,
  deriveGameColumns,
  validatePublishSnapshot,
} from './publish-game';
import type { MoveOperationLog } from './saved-game-types';

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    title: 'My blindfold win',
    description: 'Tips welcome on the middlegame.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6'],
    playerColor: 'white',
    engineConfig: { kind: 'maia', rating: 1600 },
    result: 'win',
    ...overrides,
  };
}

function log(overrides: Partial<MoveOperationLog> = {}): MoveOperationLog {
  return {
    inputMethod: 'text',
    peekCount: 0,
    undoCount: 0,
    movePeekCount: 0,
    invalidCount: 0,
    ...overrides,
  };
}

describe('validatePublishSnapshot', () => {
  it('accepts a well-formed snapshot and normalizes it', () => {
    const res = validatePublishSnapshot(validInput({ title: '  Spaced  ' }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.game.title).toBe('Spaced');
    expect(res.game.startingFen).toBeNull();
    expect(res.game.result).toBe('win');
    expect(res.game.engineConfig).toEqual({ kind: 'maia', rating: 1600 });
  });

  it('drops an empty description to null', () => {
    const res = validatePublishSnapshot(validInput({ description: '   ' }));
    expect(res.ok && res.game.description).toBeNull();
  });

  it.each([
    ['', 'invalid_title'],
    ['x'.repeat(MAX_TITLE_LENGTH + 1), 'invalid_title'],
  ])('rejects bad titles', (title, error) => {
    expect(validatePublishSnapshot(validInput({ title }))).toEqual({ ok: false, error });
  });

  it('rejects an over-long description', () => {
    const res = validatePublishSnapshot(
      validInput({ description: 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1) })
    );
    expect(res).toEqual({ ok: false, error: 'invalid_description' });
  });

  it('rejects empty / non-string / over-long move lists', () => {
    expect(validatePublishSnapshot(validInput({ moves: [] })).ok).toBe(false);
    expect(validatePublishSnapshot(validInput({ moves: [1, 2] })).ok).toBe(false);
    expect(validatePublishSnapshot(validInput({ moves: Array(MAX_MOVES + 1).fill('e4') })).ok).toBe(
      false
    );
  });

  it('rejects bad color / result / engine', () => {
    expect(validatePublishSnapshot(validInput({ playerColor: 'green' }))).toEqual({
      ok: false,
      error: 'invalid_player_color',
    });
    expect(validatePublishSnapshot(validInput({ result: 'tie' }))).toEqual({
      ok: false,
      error: 'invalid_result',
    });
    expect(
      validatePublishSnapshot(validInput({ engineConfig: { kind: 'maia', rating: 9999 } }))
    ).toEqual({
      ok: false,
      error: 'invalid_engine',
    });
  });

  it('rejects an invalid starting FEN', () => {
    expect(validatePublishSnapshot(validInput({ startingFen: 'not-a-fen' }))).toEqual({
      ok: false,
      error: 'invalid_fen',
    });
  });

  it('keeps a setup prefix within [1, moves.length] and drops anything else to null', () => {
    const ok = validatePublishSnapshot(validInput({ setupPlies: 3 }));
    expect(ok.ok && ok.game.setupPlies).toBe(3);

    for (const bad of [0, -1, 5, 1.5, '3', null, undefined]) {
      const res = validatePublishSnapshot(validInput({ setupPlies: bad }));
      expect(res.ok && res.game.setupPlies).toBe(null);
    }
  });

  it('rejects an illegal move sequence', () => {
    // e4 then e4 again is illegal (the pawn is no longer on e2).
    expect(validatePublishSnapshot(validInput({ moves: ['e4', 'e4'] }))).toEqual({
      ok: false,
      error: 'illegal_moves',
    });
  });

  it('keeps operationLogs when sane, drops them when longer than the move list', () => {
    const ok = validatePublishSnapshot(
      validInput({ operationLogs: [log(), log({ peekCount: 1 })] })
    );
    expect(ok.ok && ok.game.operationLogs).toHaveLength(2);

    const tooMany = validatePublishSnapshot(
      validInput({ moves: ['e4'], operationLogs: [log(), log()] })
    );
    expect(tooMany.ok && tooMany.game.operationLogs).toBeNull();
  });

  it('keeps captured invalidAttempts on a published log, bounding count and length', () => {
    const res = validatePublishSnapshot(
      validInput({
        operationLogs: [
          log({ invalidCount: 2, invalidAttempts: ['Nf3', 'Bb4'] }),
          // A crafted payload: too many entries and an over-long string.
          log({
            invalidCount: 30,
            invalidAttempts: [...Array(30).fill('e4'), 'x'.repeat(50)],
          }),
        ],
      })
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const logs = res.game.operationLogs!;
    expect(logs[0].invalidAttempts).toEqual(['Nf3', 'Bb4']);
    expect(logs[1].invalidAttempts).toHaveLength(20); // capped
    expect(logs[1].invalidAttempts!.every((s) => s.length <= 12)).toBe(true);
  });

  it('strips non-string / empty invalidAttempts to undefined', () => {
    const res = validatePublishSnapshot(
      validInput({
        operationLogs: [
          log({ invalidCount: 1, invalidAttempts: [123, null, 'Nf3'] as unknown as string[] }),
          log({ invalidCount: 0, invalidAttempts: [] }),
        ],
      })
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const logs = res.game.operationLogs!;
    expect(logs[0].invalidAttempts).toEqual(['Nf3']); // non-strings dropped
    expect(logs[1].invalidAttempts).toBeUndefined(); // empty → undefined
  });

  it('keeps well-formed operationTotals, whitelisting the known counters', () => {
    const res = validatePublishSnapshot(
      validInput({
        operationTotals: { peeks: 3, movePeeks: 1, undos: 2, invalidMoves: 4, extra: 'nope' },
      })
    );
    expect(res.ok && res.game.operationTotals).toEqual({
      peeks: 3,
      movePeeks: 1,
      undos: 2,
      invalidMoves: 4,
    });
  });

  it('drops absent or malformed operationTotals to null without rejecting the publish', () => {
    const absent = validatePublishSnapshot(validInput());
    expect(absent.ok && absent.game.operationTotals).toBeNull();

    for (const bad of [
      { peeks: -1, movePeeks: 0, undos: 0, invalidMoves: 0 },
      { peeks: 1.5, movePeeks: 0, undos: 0, invalidMoves: 0 },
      { peeks: 1, movePeeks: 0, undos: 0 }, // missing counter
      'totals',
    ]) {
      const res = validatePublishSnapshot(validInput({ operationTotals: bad }));
      expect(res.ok).toBe(true);
      expect(res.ok && res.game.operationTotals).toBeNull();
    }
  });
});

describe('deriveGameColumns', () => {
  it('passes Maia rating to engine_elo and counts plies', () => {
    const res = validatePublishSnapshot(validInput());
    if (!res.ok) throw new Error('expected valid');
    const cols = deriveGameColumns(res.game);
    expect(cols.engineKind).toBe('maia');
    expect(cols.engineElo).toBe(1600);
    expect(cols.moveCount).toBe(4);
    expect(cols.cleanRate).toBeNull(); // no operationLogs submitted
  });

  it('maps a Stockfish level and computes clean_rate from logs', () => {
    const res = validatePublishSnapshot(
      validInput({
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        // two player moves: one clean, one peeked → 50%
        operationLogs: [log(), log({ peekCount: 1 })],
      })
    );
    if (!res.ok) throw new Error('expected valid');
    const cols = deriveGameColumns(res.game);
    expect(cols.engineKind).toBe('stockfish');
    expect(cols.engineElo).toBe(1200); // getEloForSkillLevel(5)
    expect(cols.cleanRate).toBe(50);
  });
});

describe('validatePublishSnapshot play settings', () => {
  it('normalizes a valid play-settings object to the stored subset', () => {
    const res = validatePublishSnapshot(
      validInput({
        playSettings: {
          boardVisibility: 'peek',
          showOwnPieces: true,
          showOpponentPieces: false,
          pieceShapeMode: 'circles-all',
          pieceColors: 'black-only',
          pawnHideMode: 'own',
          // Extra preference fields are dropped — only the display subset is kept.
          peekMode: 'modal',
          moveInputMode: 'text',
        },
      })
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.game.playSettings).toEqual({
      boardVisibility: 'peek',
      showOwnPieces: true,
      showOpponentPieces: false,
      pieceShapeMode: 'circles-all',
      pieceColors: 'black-only',
      pawnHideMode: 'own',
    });
  });

  it('leaves play settings null when absent', () => {
    const res = validatePublishSnapshot(validInput());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.game.playSettings).toBeNull();
  });

  it('drops play settings to null on an invalid field (without rejecting the publish)', () => {
    const res = validatePublishSnapshot(
      validInput({
        playSettings: {
          boardVisibility: 'sideways',
          showOwnPieces: true,
          showOpponentPieces: true,
          pieceShapeMode: 'normal',
          pieceColors: 'normal',
        },
      })
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.game.playSettings).toBeNull();
  });
});

describe('validatePublishSnapshot play settings log', () => {
  it('keeps display-relevant change-log entries and drops non-display / unknown keys', () => {
    const res = validatePublishSnapshot(
      validInput({
        // moves length is 4 → atMoveIndex must be within [0, 4].
        playSettingsLog: [
          { atMoveIndex: 0, key: 'boardVisibility', from: 'always', to: 'never' },
          { atMoveIndex: 2, key: 'showOpponentPieces', from: true, to: false },
          { atMoveIndex: 3, key: 'pieceShapeMode', from: 'normal', to: 'circles-own' },
          // Non-display keys are discarded.
          { atMoveIndex: 1, key: 'moveInputMode', from: 'text', to: 'button' },
          { atMoveIndex: 1, key: 'peekMode', from: 'modal', to: 'inline' },
          { atMoveIndex: 1, key: 'highlightLastMove', from: true, to: false },
        ],
      })
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.game.playSettingsLog).toEqual([
      { atMoveIndex: 0, key: 'boardVisibility', to: 'never' },
      { atMoveIndex: 2, key: 'showOpponentPieces', to: false },
      { atMoveIndex: 3, key: 'pieceShapeMode', to: 'circles-own' },
    ]);
  });

  it('drops entries with an out-of-range or invalid atMoveIndex / value', () => {
    const res = validatePublishSnapshot(
      validInput({
        playSettingsLog: [
          { atMoveIndex: 99, key: 'boardVisibility', to: 'never' }, // > moveCount
          { atMoveIndex: -1, key: 'boardVisibility', to: 'peek' }, // < 0
          { atMoveIndex: 1.5, key: 'boardVisibility', to: 'peek' }, // non-integer
          { atMoveIndex: 2, key: 'pieceColors', to: 'rainbow' }, // invalid value
          { atMoveIndex: 2, key: 'showOwnPieces', to: false }, // the one good entry
        ],
      })
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.game.playSettingsLog).toEqual([{ atMoveIndex: 2, key: 'showOwnPieces', to: false }]);
  });

  it('leaves the log null when absent or empty after filtering', () => {
    expect(validatePublishSnapshot(validInput()).ok).toBe(true);
    const absent = validatePublishSnapshot(validInput());
    expect(absent.ok && absent.game.playSettingsLog).toBeNull();

    const allDropped = validatePublishSnapshot(
      validInput({ playSettingsLog: [{ atMoveIndex: 1, key: 'moveInputMode', to: 'button' }] })
    );
    expect(allDropped.ok && allDropped.game.playSettingsLog).toBeNull();
  });
});
