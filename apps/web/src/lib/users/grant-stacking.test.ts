import { describe, expect, it } from 'vitest';

import { stackGrantStart } from './grant-stacking';

describe('stackGrantStart', () => {
  const now = new Date('2026-04-08T12:00:00Z');
  const offset = (ms: number) => new Date(now.getTime() + ms);

  it('starts now when the user holds no grant', () => {
    expect(stackGrantStart(null, now)).toBe(now);
    expect(stackGrantStart(undefined, now)).toBe(now);
  });

  it('starts now when the latest grant has already expired', () => {
    expect(stackGrantStart(offset(-1), now)).toBe(now);
  });

  it('starts now when the latest grant expires exactly now', () => {
    expect(stackGrantStart(offset(0), now)).toBe(now);
  });

  it('stacks on the end of a grant that is still running', () => {
    const latest = offset(1);
    expect(stackGrantStart(latest, now)).toBe(latest);
  });
});
