import { describe, expect, it } from 'vitest';

import type { SharedSegmentLink } from './shared-segment-links';
import {
  MAX_SHARED_POSITION_LINKS,
  isPositionSharedWithOtherLines,
  selectSharedPositionLinks,
} from './shared-segment-links';

function segment(overrides: Partial<SharedSegmentLink> & { lineNo: number }): SharedSegmentLink {
  return {
    fromPly: 4,
    toPly: 6,
    label: `Line ${overrides.lineNo}`,
    otherFromPly: 4,
    ...overrides,
  };
}

describe('selectSharedPositionLinks', () => {
  it('returns nothing outside every segment', () => {
    const segments = [segment({ lineNo: 2, fromPly: 4, toPly: 6 })];

    for (const ply of [0, 3, 7]) {
      expect(
        selectSharedPositionLinks({ segments, ply, maxPly: 10, hasContinuations: false })
      ).toEqual({ links: [], remaining: 0 });
    }
  });

  it('includes both ends of a segment', () => {
    const segments = [segment({ lineNo: 2, fromPly: 4, toPly: 6 })];

    for (const ply of [4, 6]) {
      const { links } = selectSharedPositionLinks({
        segments,
        ply,
        maxPly: 10,
        hasContinuations: false,
      });
      expect(links.map((l) => l.lineNo)).toEqual([2]);
    }
  });

  it('maps the ply in focus to the same offset into the other line’s span', () => {
    const segments = [segment({ lineNo: 2, fromPly: 4, toPly: 8, otherFromPly: 10 })];

    const { links } = selectSharedPositionLinks({
      segments,
      ply: 6,
      maxPly: 10,
      hasContinuations: false,
    });

    expect(links).toEqual([{ lineNo: 2, label: 'Line 2', ply: 12 }]);
  });

  it(`shows at most ${MAX_SHARED_POSITION_LINKS} lines and counts the rest`, () => {
    const segments = [2, 3, 4, 5, 6].map((lineNo) => segment({ lineNo }));

    const { links, remaining } = selectSharedPositionLinks({
      segments,
      ply: 5,
      maxPly: 10,
      hasContinuations: false,
    });

    expect(links.map((l) => l.lineNo)).toEqual([2, 3, 4]);
    expect(remaining).toBe(2);
  });

  it('lists a line once even when two of its segments cover the ply', () => {
    // The other line reaches this position twice (e.g. a repetition), so
    // detection reports two spans at different offsets.
    const segments = [
      segment({ lineNo: 2, fromPly: 4, toPly: 6, otherFromPly: 4 }),
      segment({ lineNo: 2, fromPly: 5, toPly: 6, otherFromPly: 9 }),
      segment({ lineNo: 3, fromPly: 5, toPly: 6 }),
    ];

    const { links, remaining } = selectSharedPositionLinks({
      segments,
      ply: 5,
      maxPly: 10,
      hasContinuations: false,
    });

    expect(links).toEqual([
      { lineNo: 2, label: 'Line 2', ply: 5 },
      { lineNo: 3, label: 'Line 3', ply: 4 },
    ]);
    expect(remaining).toBe(0);
  });

  it('yields to continuation links at the final ply', () => {
    const segments = [segment({ lineNo: 2, fromPly: 8, toPly: 10 })];

    expect(
      selectSharedPositionLinks({ segments, ply: 10, maxPly: 10, hasContinuations: true })
    ).toEqual({ links: [], remaining: 0 });
  });

  it('still shows at the final ply when there is no continuation to show instead', () => {
    const segments = [segment({ lineNo: 2, fromPly: 8, toPly: 10 })];

    const { links } = selectSharedPositionLinks({
      segments,
      ply: 10,
      maxPly: 10,
      hasContinuations: false,
    });

    expect(links.map((l) => l.lineNo)).toEqual([2]);
  });

  it('is unaffected by continuations before the final ply', () => {
    const segments = [segment({ lineNo: 2, fromPly: 8, toPly: 10 })];

    const { links } = selectSharedPositionLinks({
      segments,
      ply: 9,
      maxPly: 10,
      hasContinuations: true,
    });

    expect(links.map((l) => l.lineNo)).toEqual([2]);
  });
});

describe('isPositionSharedWithOtherLines', () => {
  const segments = [segment({ lineNo: 2, fromPly: 8, toPly: 10 })];

  it('is true inside a segment, including at the final ply where the links yield', () => {
    expect(isPositionSharedWithOtherLines(segments, 8)).toBe(true);
    expect(isPositionSharedWithOtherLines(segments, 10)).toBe(true);
  });

  it('is false outside every segment', () => {
    expect(isPositionSharedWithOtherLines(segments, 7)).toBe(false);
    expect(isPositionSharedWithOtherLines([], 8)).toBe(false);
  });
});
