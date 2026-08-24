import { describe, expect, it } from 'vitest';

import { initialEngineKind } from './maia-launch';

describe('initialEngineKind', () => {
  it('preselects Maia when the param asks for it and the card is payable', () => {
    expect(initialEngineKind('maia', 'payable')).toBe('maia');
  });

  it('ignores the param while the Maia card is locked', () => {
    // A locked card cannot be selected by clicking, so a URL must not
    // produce the selected-but-locked state either.
    expect(initialEngineKind('maia', 'locked')).toBe('stockfish');
  });

  it.each([null, '', 'stockfish', 'unknown'])('defaults for param %j', (param) => {
    expect(initialEngineKind(param, 'payable')).toBe('stockfish');
  });
});
