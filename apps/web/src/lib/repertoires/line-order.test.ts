import { describe, expect, it } from 'vitest';

import { isCompleteReorder } from './line-order';

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
