import { describe, expect, it } from 'vitest';

import { chapterHeadings } from './LineChapterHeading';

const lines = (...names: (string | null)[]) => names.map((chapterName) => ({ chapterName }));

describe('chapterHeadings', () => {
  it('emits a heading only where the chapter changes', () => {
    expect(chapterHeadings(lines('A', 'A', 'B', 'B', 'B'), 'Unfiled')).toEqual([
      'A',
      null,
      'B',
      null,
      null,
    ]);
  });

  it('labels the loose lines that follow the chapters', () => {
    // Without a divider they would read as the tail of the last chapter.
    expect(chapterHeadings(lines('A', null, null), 'Unfiled')).toEqual(['A', 'Unfiled', null]);
  });

  it('shows nothing at all for a course with no chapters', () => {
    // Every line is unfiled, so "Unfiled" would be labelling the whole list.
    expect(chapterHeadings(lines(null, null, null), 'Unfiled')).toEqual([null, null, null]);
  });

  it('labels the first chapter even when unfiled lines come first', () => {
    // The arrange page pins loose lines last, but a heading must still appear
    // wherever the chapter changes rather than being assumed at index 0.
    expect(chapterHeadings(lines(null, 'A'), 'Unfiled')).toEqual(['Unfiled', 'A']);
  });

  it('re-labels a chapter name that repeats after another', () => {
    // Two chapters may share a name; grouping follows position, not identity.
    expect(chapterHeadings(lines('A', 'B', 'A'), 'Unfiled')).toEqual(['A', 'B', 'A']);
  });

  it('handles the empty list', () => {
    expect(chapterHeadings([], 'Unfiled')).toEqual([]);
  });
});
