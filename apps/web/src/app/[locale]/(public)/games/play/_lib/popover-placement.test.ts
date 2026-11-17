import { describe, expect, it } from 'vitest';

import { placePopover } from './popover-placement';

const viewport = { width: 400, height: 800 };
const size = { width: 120, height: 90 };

describe('placePopover', () => {
  it('opens below the anchor, right-aligned to it, when it fits', () => {
    expect(placePopover({ top: 100, bottom: 120, right: 300 }, size, viewport)).toEqual({
      top: 124,
      left: 180,
    });
  });

  it('opens above when there is no room below', () => {
    expect(placePopover({ top: 740, bottom: 760, right: 300 }, size, viewport)).toEqual({
      top: 646,
      left: 180,
    });
  });

  it('stays below when it fits on neither side', () => {
    const short = { width: 400, height: 150 };
    expect(placePopover({ top: 40, bottom: 60, right: 300 }, size, short).top).toBe(64);
  });

  it('is kept inside the viewport horizontally', () => {
    expect(placePopover({ top: 100, bottom: 120, right: 60 }, size, viewport).left).toBe(8);
    expect(placePopover({ top: 100, bottom: 120, right: 420 }, size, viewport).left).toBe(272);
  });
});
