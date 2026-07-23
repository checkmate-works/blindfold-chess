import { describe, expect, it } from 'vitest';

import {
  DAILY_CREATION_POINT_CAP,
  POST_CREATION_POINTS,
  cappedCreationGrantAmount,
} from './constants';

describe('cappedCreationGrantAmount', () => {
  it('awards the full POST_CREATION_POINTS when the user has earned nothing today', () => {
    expect(cappedCreationGrantAmount(0)).toBe(POST_CREATION_POINTS);
  });

  it('awards the full amount while there is still full headroom', () => {
    expect(cappedCreationGrantAmount(DAILY_CREATION_POINT_CAP - POST_CREATION_POINTS)).toBe(
      POST_CREATION_POINTS
    );
  });

  it('clamps the award to the remaining daily headroom', () => {
    // A grant never exceeds the day's remaining headroom. At the current
    // POST_CREATION_POINTS === 1 there is no partial tier (the award is 1 or
    // 0), but the clamp property holds at every headroom and re-tightens
    // automatically if the per-grant rate is ever raised again.
    for (let headroom = 0; headroom <= POST_CREATION_POINTS + 2; headroom++) {
      expect(cappedCreationGrantAmount(DAILY_CREATION_POINT_CAP - headroom)).toBe(
        Math.max(0, Math.min(POST_CREATION_POINTS, headroom))
      );
    }
  });

  it('awards 0 once the cap is exactly reached', () => {
    expect(cappedCreationGrantAmount(DAILY_CREATION_POINT_CAP)).toBe(0);
  });

  it('awards 0 (never negative) when today is already over the cap', () => {
    expect(cappedCreationGrantAmount(DAILY_CREATION_POINT_CAP + 100)).toBe(0);
  });
});
