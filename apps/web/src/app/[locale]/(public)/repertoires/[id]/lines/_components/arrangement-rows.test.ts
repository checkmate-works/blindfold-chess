import { describe, expect, it } from 'vitest';

import type { ArrangeRow } from './arrangement-rows';
import {
  appendChapter,
  arrangementKey,
  blockAt,
  isArrangementValid,
  moveBlock,
  removeChapter,
  resolveDropTarget,
} from './arrangement-rows';

const ch = (key: string, name = key): ArrangeRow => ({ kind: 'chapter', key, name });
const ln = (lineNo: number): ArrangeRow => ({
  kind: 'line',
  lineNo,
  label: `L${lineNo}`,
  moves: '',
});
const unfiled: ArrangeRow = { kind: 'unfiled' };

/** Compact rendering of a list, so expectations read like the screen does. */
const shape = (rows: readonly ArrangeRow[]) =>
  rows.map((r) =>
    r.kind === 'chapter' ? `[${r.key}]` : r.kind === 'unfiled' ? '---' : `${r.lineNo}`
  );

describe('blockAt', () => {
  const rows = [ch('a'), ln(1), ln(2), ch('b'), ln(3), unfiled, ln(4)];

  it('spans a chapter heading and every line under it', () => {
    expect(blockAt(rows, 0)).toEqual([0, 2]);
    expect(blockAt(rows, 3)).toEqual([3, 4]);
  });

  it('stops a chapter block at the unfiled divider', () => {
    expect(blockAt([ch('a'), ln(1), unfiled, ln(2)], 0)).toEqual([0, 1]);
  });

  it('spans an empty chapter as just its heading', () => {
    expect(blockAt([ch('a'), ch('b'), ln(1), unfiled], 0)).toEqual([0, 0]);
  });

  it('spans a line as itself', () => {
    expect(blockAt(rows, 1)).toEqual([1, 1]);
    expect(blockAt(rows, 6)).toEqual([6, 6]);
  });
});

describe('moveBlock', () => {
  const rows = [ch('a'), ln(1), ln(2), ch('b'), ln(3), unfiled];

  it('moves a chapter and its lines together, downwards', () => {
    expect(shape(moveBlock(rows, 0, 2, 4))).toEqual(['[b]', '3', '[a]', '1', '2', '---']);
  });

  it('moves a chapter and its lines together, upwards', () => {
    expect(shape(moveBlock(rows, 3, 4, 0))).toEqual(['[b]', '3', '[a]', '1', '2', '---']);
  });

  it('moves a single line into another chapter', () => {
    expect(shape(moveBlock(rows, 1, 1, 4))).toEqual(['[a]', '2', '[b]', '3', '1', '---']);
  });

  it('moves a line below the divider, unfiling it', () => {
    expect(shape(moveBlock(rows, 1, 1, 5))).toEqual(['[a]', '2', '[b]', '3', '---', '1']);
  });
});

describe('resolveDropTarget', () => {
  // [Op(0), 1(1), Side(2), 2(3), ---(4), 3(5)]
  const rows = [ch('Op'), ln(1), ch('Side'), ln(2), unfiled, ln(3)];

  it('drops a line UNDER the heading it was dragged up onto, not above it', () => {
    // Without the nudge the line lands at the heading's index, i.e. in the
    // PREVIOUS chapter — the bug this function exists to fix.
    const target = resolveDropTarget(rows, 3, 3, 2);
    expect(shape(moveBlock(rows, 3, 3, target))).toEqual(['[Op]', '1', '[Side]', '2', '---', '3']);
    expect(shape(moveBlock(rows, 5, 5, resolveDropTarget(rows, 5, 5, 0)))).toEqual([
      '[Op]',
      '3',
      '1',
      '[Side]',
      '2',
      '---',
    ]);
  });

  it('needs no nudge dragging a line down onto a heading', () => {
    // Removing the block first already shifts the heading up by one.
    const target = resolveDropTarget(rows, 1, 1, 2);
    expect(shape(moveBlock(rows, 1, 1, target))).toEqual(['[Op]', '[Side]', '1', '2', '---', '3']);
  });

  it('unfiles a line dragged up onto the divider', () => {
    expect(shape(moveBlock(rows, 5, 5, resolveDropTarget(rows, 5, 5, 4)))).toEqual([
      '[Op]',
      '1',
      '[Side]',
      '2',
      '---',
      '3',
    ]);
  });

  it('leaves a chapter block alone — dropping it on a heading means "go above"', () => {
    const target = resolveDropTarget(rows, 2, 3, 0);
    expect(target).toBe(0);
    expect(shape(moveBlock(rows, 2, 3, target))).toEqual(['[Side]', '2', '[Op]', '1', '---', '3']);
  });
});

describe('isArrangementValid', () => {
  it('accepts headings above the divider', () => {
    expect(isArrangementValid([ch('a'), ln(1), unfiled, ln(2)])).toBe(true);
  });

  it('rejects a heading below the divider', () => {
    // "Unfiled" means "below every chapter", so this describes a bucket that is
    // both a chapter and not one.
    expect(isArrangementValid([unfiled, ch('a'), ln(1)])).toBe(false);
  });

  it('rejects a list with no divider at all', () => {
    expect(isArrangementValid([ch('a'), ln(1)])).toBe(false);
  });
});

describe('removeChapter', () => {
  it('sends the removed chapter’s lines to the unfiled bucket, not the chapter above', () => {
    const rows = [ch('a'), ln(1), ch('b'), ln(2), ln(3), unfiled, ln(4)];
    expect(shape(removeChapter(rows, 'b'))).toEqual(['[a]', '1', '---', '4', '2', '3']);
  });

  it('is a no-op for a key that is not there', () => {
    const rows = [ch('a'), ln(1), unfiled];
    expect(shape(removeChapter(rows, 'nope'))).toEqual(shape(rows));
  });

  it('removes an empty chapter', () => {
    expect(shape(removeChapter([ch('a'), ch('b'), ln(1), unfiled], 'a'))).toEqual([
      '[b]',
      '1',
      '---',
    ]);
  });
});

describe('appendChapter', () => {
  it('inserts the new heading directly above the divider, below the existing chapters', () => {
    const next = appendChapter([ch('a'), ln(1), unfiled, ln(2)], 'New');
    const divider = next.findIndex((r) => r.kind === 'unfiled');

    expect(next[divider - 1]).toMatchObject({ kind: 'chapter', name: 'New' });
    // Everything else keeps its place; only the heading is new.
    expect(shape(next.filter((_, i) => i !== divider - 1))).toEqual(
      shape([ch('a'), ln(1), unfiled, ln(2)])
    );
  });

  it('produces a key the server will read as "create this"', () => {
    const [created] = appendChapter([unfiled], 'New').filter((r) => r.kind === 'chapter');
    expect(created).toMatchObject({ kind: 'chapter', name: 'New' });
    expect(created.kind === 'chapter' && created.key.startsWith('new:')).toBe(true);
  });

  it('keeps the arrangement valid', () => {
    expect(isArrangementValid(appendChapter([ch('a'), ln(1), unfiled], 'New'))).toBe(true);
  });
});

describe('arrangementKey', () => {
  it('changes when a chapter is renamed, not just when rows move', () => {
    const before = [ch('a', 'Old'), ln(1), unfiled];
    const after = [ch('a', 'New'), ln(1), unfiled];
    expect(arrangementKey(before)).not.toBe(arrangementKey(after));
  });

  it('ignores whitespace-only differences in a name', () => {
    expect(arrangementKey([ch('a', 'Same')])).toBe(arrangementKey([ch('a', '  Same  ')]));
  });

  it('changes when a line moves between chapters', () => {
    expect(arrangementKey([ch('a'), ln(1), unfiled])).not.toBe(
      arrangementKey([ch('a'), unfiled, ln(1)])
    );
  });
});
