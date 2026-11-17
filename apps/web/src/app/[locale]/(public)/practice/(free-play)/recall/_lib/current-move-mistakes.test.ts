import { describe, expect, it } from 'vitest';

import { countCurrentMoveMistakes } from './current-move-mistakes';
import type { MoveLogEntry } from './move-log-entry';

function entry(status: MoveLogEntry['status']): MoveLogEntry {
  return { moveNumber: 1, isWhiteMove: true, move: 'e4', status };
}

describe('countCurrentMoveMistakes', () => {
  it('is 0 for an empty log', () => {
    expect(countCurrentMoveMistakes([])).toBe(0);
  });

  it('counts the trailing run of wrong attempts', () => {
    expect(
      countCurrentMoveMistakes([entry('correct'), entry('incorrect'), entry('incorrect')])
    ).toBe(2);
  });

  it('ignores wrong attempts on moves that are already resolved', () => {
    expect(
      countCurrentMoveMistakes([
        entry('incorrect'),
        entry('incorrect'),
        entry('incorrect'),
        entry('correct'),
        entry('incorrect'),
      ])
    ).toBe(1);
  });

  it.each(['correct', 'skipped', 'autoFilled', 'auto'] as const)(
    'resets once the move is resolved as %s',
    (status) => {
      expect(
        countCurrentMoveMistakes([
          entry('incorrect'),
          entry('incorrect'),
          entry('incorrect'),
          entry(status),
        ])
      ).toBe(0);
    }
  );
});
