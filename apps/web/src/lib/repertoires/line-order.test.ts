import { describe, expect, it } from 'vitest';

import type { ArrangementItem } from './line-order';
import { isCompleteReorder, resolveArrangement, validateArrangement } from './line-order';

describe('isCompleteReorder', () => {
  it('accepts a rearrangement of exactly the live lines', () => {
    expect(isCompleteReorder([1, 2, 3], [3, 1, 2])).toBe(true);
  });

  it('accepts an unchanged order', () => {
    expect(isCompleteReorder([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('accepts a gapped set — line numbers are not dense after a delete', () => {
    expect(isCompleteReorder([1, 3, 7], [7, 1, 3])).toBe(true);
  });

  it('accepts the empty and single-line cases', () => {
    expect(isCompleteReorder([], [])).toBe(true);
    expect(isCompleteReorder([4], [4])).toBe(true);
  });

  it('rejects a missing line (client deleted one, or dropped it)', () => {
    expect(isCompleteReorder([1, 2, 3], [3, 1])).toBe(false);
  });

  it('rejects an extra line', () => {
    expect(isCompleteReorder([1, 2], [1, 2, 3])).toBe(false);
  });

  it('rejects a duplicate, even at the right length', () => {
    // Length matches `live`, so only the dup check catches this — and it must,
    // since the last write would win and one line would silently lose its slot.
    expect(isCompleteReorder([1, 2, 3], [1, 2, 2])).toBe(false);
  });

  it('rejects a number that is not live (a soft-deleted line resubmitted)', () => {
    expect(isCompleteReorder([1, 3], [1, 2])).toBe(false);
  });

  it('rejects a swap for a line deleted in another tab mid-drag', () => {
    // Client still believes in line 2; the server no longer has it.
    expect(isCompleteReorder([1, 3], [2, 1, 3])).toBe(false);
  });
});

const chapter = (key: string, name = key): ArrangementItem => ({ kind: 'chapter', key, name });
const line = (lineNo: number): ArrangementItem => ({ kind: 'line', lineNo });
const unfiled: ArrangementItem = { kind: 'unfiled' };

describe('resolveArrangement', () => {
  it('files each line under the heading above it, numbering from 0 per chapter', () => {
    const { chapters, lines } = resolveArrangement([
      chapter('a'),
      line(1),
      line(2),
      chapter('b'),
      line(3),
      unfiled,
      line(4),
    ]);

    expect(chapters).toEqual([
      { key: 'a', name: 'a', seq: 0 },
      { key: 'b', name: 'b', seq: 1 },
    ]);
    expect(lines).toEqual([
      { lineNo: 1, chapterKey: 'a', seq: 0 },
      { lineNo: 2, chapterKey: 'a', seq: 1 },
      { lineNo: 3, chapterKey: 'b', seq: 0 },
      { lineNo: 4, chapterKey: null, seq: 0 },
    ]);
  });

  it('treats lines above every heading as unfiled', () => {
    // The UI pins the divider last so it can't produce this, but resolving it
    // rather than rejecting it keeps the function total.
    const { lines } = resolveArrangement([line(9), chapter('a'), line(1)]);
    expect(lines).toEqual([
      { lineNo: 9, chapterKey: null, seq: 0 },
      { lineNo: 1, chapterKey: 'a', seq: 0 },
    ]);
  });

  it('continues the unfiled bucket rather than restarting it', () => {
    // Both runs are the same bucket, so their seqs must not collide.
    const { lines } = resolveArrangement([line(9), chapter('a'), line(1), unfiled, line(8)]);
    expect(lines.filter((l) => l.chapterKey === null).map((l) => l.seq)).toEqual([0, 1]);
  });

  it('keeps an empty chapter, with no lines under it', () => {
    const { chapters, lines } = resolveArrangement([chapter('a'), chapter('b'), line(1), unfiled]);
    expect(chapters.map((c) => c.key)).toEqual(['a', 'b']);
    expect(lines).toEqual([{ lineNo: 1, chapterKey: 'b', seq: 0 }]);
  });

  it('trims chapter names', () => {
    const { chapters } = resolveArrangement([chapter('a', '  Openings  ')]);
    expect(chapters[0].name).toBe('Openings');
  });
});

describe('validateArrangement', () => {
  const live = [1, 2];
  const liveChapters = ['ch-1'];

  it('accepts a well-formed arrangement', () => {
    expect(
      validateArrangement([chapter('ch-1'), line(1), unfiled, line(2)], live, liveChapters)
    ).toBeNull();
  });

  it('accepts a chapter the client is asking to create', () => {
    expect(
      validateArrangement(
        [chapter('new:0', 'Fresh'), line(1), line(2), unfiled],
        live,
        liveChapters
      )
    ).toBeNull();
  });

  it('accepts dropping a live chapter — absence is a delete, not staleness', () => {
    expect(validateArrangement([unfiled, line(1), line(2)], live, liveChapters)).toBeNull();
  });

  it('rejects a line set that does not match the live lines', () => {
    expect(validateArrangement([unfiled, line(1)], live, liveChapters)).toBe('staleOrder');
  });

  it('rejects more than one unfiled divider', () => {
    // Two dividers would make "which bucket" depend on which one you read.
    expect(validateArrangement([unfiled, line(1), unfiled, line(2)], live, liveChapters)).toBe(
      'staleOrder'
    );
  });

  it('rejects a duplicated chapter key', () => {
    expect(
      validateArrangement(
        [chapter('ch-1'), line(1), chapter('ch-1'), line(2), unfiled],
        live,
        liveChapters
      )
    ).toBe('invalidChapter');
  });

  it('rejects a chapter id this repertoire does not own', () => {
    // The composite FK would refuse it anyway; failing here names the problem.
    expect(
      validateArrangement([chapter('someone-elses'), line(1), line(2), unfiled], live, liveChapters)
    ).toBe('invalidChapter');
  });

  it('rejects a blank chapter name', () => {
    expect(
      validateArrangement([chapter('ch-1', '   '), line(1), line(2), unfiled], live, liveChapters)
    ).toBe('invalidChapter');
  });

  it('rejects an over-long chapter name', () => {
    expect(
      validateArrangement(
        [chapter('ch-1', 'x'.repeat(256)), line(1), line(2), unfiled],
        live,
        liveChapters
      )
    ).toBe('invalidChapter');
  });
});
