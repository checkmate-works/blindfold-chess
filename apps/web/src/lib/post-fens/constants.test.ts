import { describe, expect, it } from 'vitest';

import { FEN_MAX_LENGTH } from './constants';

describe('FEN_MAX_LENGTH', () => {
  // Regression guard: this constant is the canonical source for the FEN
  // length cap shared across the Server Actions, the input UI, and the DB
  // CHECK constraint (Lessons §10). Drifting any one layer without
  // updating this value would re-introduce the silent UX gap that the
  // shared constant was extracted to prevent.
  it('is pinned at 100 in lock-step with the post_fen_attachments.fen column width', () => {
    expect(FEN_MAX_LENGTH).toBe(100);
  });
});
