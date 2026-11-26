import { describe, expect, it } from 'vitest';

import { getRankSlugForMenuType } from './module-rank-mapping';

describe('getRankSlugForMenuType', () => {
  it('shows the 2kyu badge on the Position Memory card through its exam problem', () => {
    expect(getRankSlugForMenuType('position_memory')).toBe('2kyu');
  });

  it('shows the 2kyu badge on the Puzzle card through its exam problem', () => {
    expect(getRankSlugForMenuType('puzzle')).toBe('2kyu');
  });

  it('maps the introductory modules to mukyu', () => {
    expect(getRankSlugForMenuType('algebraic_notation')).toBe('mukyu');
    expect(getRankSlugForMenuType('quadrant_anchors')).toBe('mukyu');
  });

  it('maps a challenge module to the lowest rank that names it', () => {
    expect(getRankSlugForMenuType('square_colors')).toBe('5kyu');
  });

  it('returns null for a module no rank asks for', () => {
    expect(getRankSlugForMenuType('no_such_module')).toBeNull();
  });
});
