import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PROFILE_FEED_FILTER,
  PROFILE_FEED_FILTERS,
  parseProfileFeedFilter,
  resolveProfileFeedEntityTypes,
} from './profile-feed-filters';

describe('parseProfileFeedFilter', () => {
  it.each(PROFILE_FEED_FILTERS)('should accept the known filter %s', (filter) => {
    expect(parseProfileFeedFilter(filter)).toBe(filter);
  });

  it.each([
    ['an unknown name', 'everything'],
    ['a raw entity type', 'topic_post'],
    ['an entity type with no chip', 'challenge_rank_update'],
    ['an empty string', ''],
    ['a prototype key', '__proto__'],
    ['a constructor key', 'constructor'],
  ])('should fall back to the default for %s', (_label, value) => {
    expect(parseProfileFeedFilter(value)).toBe(DEFAULT_PROFILE_FEED_FILTER);
  });

  it('should fall back to the default for null and undefined', () => {
    expect(parseProfileFeedFilter(null)).toBe(DEFAULT_PROFILE_FEED_FILTER);
    expect(parseProfileFeedFilter(undefined)).toBe(DEFAULT_PROFILE_FEED_FILTER);
  });
});

describe('resolveProfileFeedEntityTypes', () => {
  it('should not filter for the default (all) chip', () => {
    expect(resolveProfileFeedEntityTypes('all')).toBeUndefined();
  });

  it.each([
    ['topics', ['topic_post']],
    ['problems', ['position']],
    ['games', ['game']],
    ['chunks', ['chunk']],
  ] as const)('should resolve %s to its entity types', (filter, expected) => {
    expect(resolveProfileFeedEntityTypes(filter)).toEqual(expected);
  });

  it('should never surface challenge_rank_update as its own chip', () => {
    // Those rows are reaped after 30 days, so a chip for them would routinely
    // open onto an empty list no archive page can back. They ride along in
    // `all` instead.
    const chipped = PROFILE_FEED_FILTERS.flatMap(
      (filter) => resolveProfileFeedEntityTypes(filter) ?? []
    );
    expect(chipped).not.toContain('challenge_rank_update');
  });
});
