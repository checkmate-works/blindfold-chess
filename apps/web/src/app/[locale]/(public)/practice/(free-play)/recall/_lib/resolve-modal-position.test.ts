import { describe, expect, it } from 'vitest';

import type { MoveLogEntry } from './move-log-entry';
import { resolveModalPosition } from './resolve-modal-position';

/** Terse builder — only the fields the resolver looks at matter here. */
function entry(status: MoveLogEntry['status'], move = 'e4'): MoveLogEntry {
  return { moveNumber: 1, isWhiteMove: true, move, status };
}

describe('resolveModalPosition', () => {
  it('resolves a correct entry to the position right after its own move', () => {
    const correct = entry('correct');
    const moveLog = [correct];
    expect(resolveModalPosition(correct, moveLog)).toBe(0);
  });

  it('resolves the second engaged move to position 1', () => {
    const first = entry('correct', 'e4');
    const second = entry('skipped', 'e5');
    const moveLog = [first, second];
    expect(resolveModalPosition(second, moveLog)).toBe(1);
  });

  it('resolves an incorrect attempt on the first move to the start (-2)', () => {
    const wrong = entry('incorrect', 'e3');
    const moveLog = [wrong, entry('correct', 'e4')];
    expect(resolveModalPosition(wrong, moveLog)).toBe(-2);
  });

  it('resolves an incorrect attempt on a later move to the position before it', () => {
    const first = entry('correct', 'e4');
    const wrong = entry('incorrect', 'Nc3');
    const moveLog = [first, wrong, entry('correct', 'Nf3')];
    expect(resolveModalPosition(wrong, moveLog)).toBe(0);
  });

  it('does not advance the index past incorrect attempts', () => {
    const first = entry('correct', 'e4');
    const wrongAttempt1 = entry('incorrect', 'Nc3');
    const wrongAttempt2 = entry('incorrect', 'Bc4');
    const resolved = entry('correct', 'Nf3');
    const moveLog = [first, wrongAttempt1, wrongAttempt2, resolved];
    expect(resolveModalPosition(resolved, moveLog)).toBe(1);
  });

  it('counts opponent auto-fills (auto) toward the move index, same as skipped/autoFilled', () => {
    const first = entry('correct', 'e4');
    const opponentAuto = entry('auto', 'e5');
    const second = entry('autoFilled', 'Nf3');
    const moveLog = [first, opponentAuto, second];
    expect(resolveModalPosition(second, moveLog)).toBe(2);
  });

  it('falls back to the start when the entry is not found in the log', () => {
    const missing = entry('correct', 'e4');
    expect(resolveModalPosition(missing, [])).toBe(-2);
  });
});
