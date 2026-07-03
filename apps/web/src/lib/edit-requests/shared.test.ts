import { describe, expect, it } from 'vitest';

import { isEditRequestStatus } from './shared';

describe('isEditRequestStatus', () => {
  it.each(['pending', 'accepted', 'rejected', 'withdrawn'])('accepts %s', (s) => {
    expect(isEditRequestStatus(s)).toBe(true);
  });

  it.each(['', 'open', 'closed', 'PENDING', null, undefined, 0, {}])('rejects %s', (s) => {
    expect(isEditRequestStatus(s)).toBe(false);
  });
});
