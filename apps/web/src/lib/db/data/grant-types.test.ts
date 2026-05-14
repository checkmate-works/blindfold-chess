import { describe, expect, it } from 'vitest';

import {
  BENEFIT_TYPES,
  type BenefitType,
  GRANT_TYPES,
  type GrantType,
  isBenefitType,
  isGrantType,
} from './grant-types';

describe('GRANT_TYPES', () => {
  it('contains all expected grant type values', () => {
    expect(GRANT_TYPES).toEqual(['admin_manual', 'topic_post']);
  });

  it('contains exactly 2 entries (boundary: collection size)', () => {
    expect(GRANT_TYPES).toHaveLength(2);
  });

  it('includes admin_manual', () => {
    expect(GRANT_TYPES).toContain('admin_manual');
  });

  it('includes topic_post (preserved for legacy grant-history display rows)', () => {
    expect(GRANT_TYPES).toContain('topic_post');
  });
});

describe('isGrantType', () => {
  it('returns true for every value in GRANT_TYPES', () => {
    for (const t of GRANT_TYPES) {
      expect(isGrantType(t)).toBe(true);
    }
  });

  it('returns true for admin_manual specifically', () => {
    expect(isGrantType('admin_manual')).toBe(true);
  });

  it('returns false for empty string (boundary)', () => {
    expect(isGrantType('')).toBe(false);
  });

  it('returns false for an unknown string', () => {
    expect(isGrantType('unknown')).toBe(false);
  });

  it('returns false for puzzle_creation (deferred grant type)', () => {
    expect(isGrantType('puzzle_creation')).toBe(false);
  });

  it('returns false for campaign (deferred grant type)', () => {
    expect(isGrantType('campaign')).toBe(false);
  });

  it('returns false for typo "topic_posts" (close-but-wrong)', () => {
    expect(isGrantType('topic_posts')).toBe(false);
  });

  it('is case-sensitive — returns false for "TOPIC_POST"', () => {
    expect(isGrantType('TOPIC_POST')).toBe(false);
  });

  it('is case-sensitive — returns false for "Admin_Manual"', () => {
    expect(isGrantType('Admin_Manual')).toBe(false);
  });

  it('returns false for a value with leading whitespace', () => {
    expect(isGrantType(' topic_post')).toBe(false);
  });

  it('returns false for a value with trailing whitespace', () => {
    expect(isGrantType('topic_post ')).toBe(false);
  });

  it('returns false for a numeric-looking string', () => {
    expect(isGrantType('0')).toBe(false);
  });

  it('type-narrows correctly when used as a guard (compile-time + runtime check)', () => {
    const candidate: string = 'topic_post';
    if (isGrantType(candidate)) {
      // Inside this branch, `candidate` is narrowed to GrantType. The following
      // assignment compiles only if narrowing works, providing a TS-level check.
      const narrowed: GrantType = candidate;
      expect(narrowed).toBe('topic_post');
    } else {
      throw new Error('isGrantType should have returned true for "topic_post"');
    }
  });
});

describe('BENEFIT_TYPES', () => {
  it('contains the documented set of benefit types', () => {
    expect(BENEFIT_TYPES).toEqual(['ad_free', 'paywall_access', 'maia_access']);
  });

  it('includes maia_access (Maia engine entitlement)', () => {
    expect(BENEFIT_TYPES).toContain('maia_access');
  });
});

describe('isBenefitType', () => {
  it('returns true for every value in BENEFIT_TYPES', () => {
    for (const bt of BENEFIT_TYPES) {
      expect(isBenefitType(bt)).toBe(true);
    }
  });

  it('returns true for maia_access', () => {
    expect(isBenefitType('maia_access')).toBe(true);
  });

  it('returns false for an unknown benefit type', () => {
    expect(isBenefitType('unknown')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isBenefitType('')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isBenefitType('MAIA_ACCESS')).toBe(false);
    expect(isBenefitType('Ad_Free')).toBe(false);
  });

  it('type-narrows correctly when used as a guard', () => {
    const candidate: string = 'maia_access';
    if (isBenefitType(candidate)) {
      const narrowed: BenefitType = candidate;
      expect(narrowed).toBe('maia_access');
    } else {
      throw new Error('isBenefitType should have returned true for "maia_access"');
    }
  });
});
