import { describe, expect, it } from 'vitest';

import { BENEFIT_ACTIVE_STATUSES, DISPLAYABLE_STATUSES } from './subscription-constants';

describe('BENEFIT_ACTIVE_STATUSES', () => {
  it('should contain active and trialing', () => {
    expect(BENEFIT_ACTIVE_STATUSES).toContain('active');
    expect(BENEFIT_ACTIVE_STATUSES).toContain('trialing');
  });

  it('should have exactly 2 statuses', () => {
    expect(BENEFIT_ACTIVE_STATUSES).toHaveLength(2);
  });

  it('should not contain past_due', () => {
    expect(BENEFIT_ACTIVE_STATUSES).not.toContain('past_due');
  });

  it('should not contain canceled', () => {
    expect(BENEFIT_ACTIVE_STATUSES).not.toContain('canceled');
  });
});

describe('DISPLAYABLE_STATUSES', () => {
  it('should contain active, trialing, and past_due', () => {
    expect(DISPLAYABLE_STATUSES).toContain('active');
    expect(DISPLAYABLE_STATUSES).toContain('trialing');
    expect(DISPLAYABLE_STATUSES).toContain('past_due');
  });

  it('should have exactly 3 statuses', () => {
    expect(DISPLAYABLE_STATUSES).toHaveLength(3);
  });

  it('should not contain canceled', () => {
    expect(DISPLAYABLE_STATUSES).not.toContain('canceled');
  });

  it('should not contain unpaid', () => {
    expect(DISPLAYABLE_STATUSES).not.toContain('unpaid');
  });

  it('should be a superset of BENEFIT_ACTIVE_STATUSES', () => {
    for (const status of BENEFIT_ACTIVE_STATUSES) {
      expect(DISPLAYABLE_STATUSES).toContain(status);
    }
  });
});
