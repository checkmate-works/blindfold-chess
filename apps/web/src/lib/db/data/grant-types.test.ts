import { describe, expect, it } from 'vitest';

import {
  type AutomatedGrantType,
  GRANT_TYPES,
  GRANT_TYPE_DEFAULTS,
  type GrantType,
  isGrantType,
} from './grant-types';

describe('GRANT_TYPES', () => {
  it('contains all expected grant type values', () => {
    expect(GRANT_TYPES).toEqual(['admin_manual', 'topic_post', 'puzzle_creation', 'campaign']);
  });

  it('contains exactly 4 entries (boundary: collection size)', () => {
    expect(GRANT_TYPES).toHaveLength(4);
  });

  it('includes admin_manual', () => {
    expect(GRANT_TYPES).toContain('admin_manual');
  });

  it('includes topic_post', () => {
    expect(GRANT_TYPES).toContain('topic_post');
  });

  it('includes puzzle_creation', () => {
    expect(GRANT_TYPES).toContain('puzzle_creation');
  });

  it('includes campaign', () => {
    expect(GRANT_TYPES).toContain('campaign');
  });
});

describe('GRANT_TYPE_DEFAULTS', () => {
  it('has an entry for every AutomatedGrantType (all GrantTypes except admin_manual)', () => {
    const automatedTypes = GRANT_TYPES.filter((t): t is AutomatedGrantType => t !== 'admin_manual');
    for (const t of automatedTypes) {
      expect(GRANT_TYPE_DEFAULTS).toHaveProperty(t);
    }
    expect(Object.keys(GRANT_TYPE_DEFAULTS).sort()).toEqual([...automatedTypes].sort());
  });

  it('does NOT have an entry for admin_manual (intentional — caller must specify)', () => {
    expect(GRANT_TYPE_DEFAULTS).not.toHaveProperty('admin_manual');
  });

  it('every entry has a valid benefitType (ad_free or paywall_access)', () => {
    const allowed = new Set(['ad_free', 'paywall_access']);
    for (const [key, config] of Object.entries(GRANT_TYPE_DEFAULTS)) {
      expect(allowed.has(config.benefitType), `${key}.benefitType invalid`).toBe(true);
    }
  });

  it('every entry has durationDays > 0', () => {
    for (const [key, config] of Object.entries(GRANT_TYPE_DEFAULTS)) {
      expect(config.durationDays, `${key}.durationDays must be > 0`).toBeGreaterThan(0);
    }
  });

  it('every entry has an integer durationDays (no fractional days)', () => {
    for (const [key, config] of Object.entries(GRANT_TYPE_DEFAULTS)) {
      expect(Number.isInteger(config.durationDays), `${key}.durationDays must be integer`).toBe(
        true
      );
    }
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
