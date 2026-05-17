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

  it('awards a partial amount when the cap is nearly reached', () => {
    // 1 point of headroom left → only 1 is granted, not the full 3.
    expect(cappedCreationGrantAmount(DAILY_CREATION_POINT_CAP - 1)).toBe(1);
    expect(cappedCreationGrantAmount(DAILY_CREATION_POINT_CAP - 2)).toBe(2);
  });

  it('awards 0 once the cap is exactly reached', () => {
    expect(cappedCreationGrantAmount(DAILY_CREATION_POINT_CAP)).toBe(0);
  });

  it('awards 0 (never negative) when today is already over the cap', () => {
    expect(cappedCreationGrantAmount(DAILY_CREATION_POINT_CAP + 100)).toBe(0);
  });
});
