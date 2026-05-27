import { describe, expect, it } from 'vitest';

import {
  CHUNK_SLUG_MAX_LENGTH,
  CHUNK_TITLE_MAX_LENGTH,
  parseFeedbackTopics,
  validateChunkMutationData,
} from './validation';

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const VALID_USER_ID = '00000000-0000-0000-0000-000000000001';

function base() {
  return {
    representativeFen: VALID_FEN,
    title: 'Rook Battery',
    slug: 'rook-battery',
    userId: VALID_USER_ID,
  };
}

describe('validateChunkMutationData — slug length boundary', () => {
  it('accepts a slug at exactly CHUNK_SLUG_MAX_LENGTH (50) characters', () => {
    // 50-char slug, no consecutive hyphens, alnum-only segments.
    const slug = 'a'.repeat(CHUNK_SLUG_MAX_LENGTH);
    expect(slug.length).toBe(50);

    const result = validateChunkMutationData({ ...base(), slug });
    expect(result).toBeNull();
  });

  it('rejects a slug at CHUNK_SLUG_MAX_LENGTH + 1 (51) characters', () => {
    // The cap is intentionally below the column width (varchar(255)) because
    // chunk slugs ride through topic_posts.topic_key which is varchar(50).
    // See validation.ts CHUNK_SLUG_MAX_LENGTH @design.
    const slug = 'a'.repeat(CHUNK_SLUG_MAX_LENGTH + 1);
    expect(slug.length).toBe(51);

    const result = validateChunkMutationData({ ...base(), slug });
    expect(result).toMatch(/Slug must be 50 characters or fewer/);
  });

  it('rejects an uppercase slug even at valid length', () => {
    // Non-ASCII / uppercase / unicode would also break the topic_posts.topic_key
    // round-trip path: chunk slug must match CHUNK_SLUG_PATTERN.
    const result = validateChunkMutationData({ ...base(), slug: 'Rook-Battery' });
    expect(result).toMatch(/lowercase letters, numbers, and hyphens/);
  });

  it('rejects a slug containing unicode characters', () => {
    const result = validateChunkMutationData({ ...base(), slug: 'ルーク-battery' });
    expect(result).toMatch(/lowercase letters, numbers, and hyphens/);
  });
});

describe('validateChunkMutationData — title length boundary', () => {
  it('accepts a title at exactly CHUNK_TITLE_MAX_LENGTH (255)', () => {
    const title = 'A'.repeat(CHUNK_TITLE_MAX_LENGTH);
    const result = validateChunkMutationData({ ...base(), title });
    expect(result).toBeNull();
  });

  it('rejects a title at CHUNK_TITLE_MAX_LENGTH + 1 (256)', () => {
    const title = 'A'.repeat(CHUNK_TITLE_MAX_LENGTH + 1);
    const result = validateChunkMutationData({ ...base(), title });
    expect(result).toMatch(/Title must be 255 characters or fewer/);
  });
});

describe('parseFeedbackTopics', () => {
  it('returns an empty array for null / undefined', () => {
    expect(parseFeedbackTopics(undefined)).toEqual([]);
    expect(parseFeedbackTopics(null)).toEqual([]);
  });

  it('returns null when input is not an array', () => {
    expect(parseFeedbackTopics('title')).toBeNull();
    expect(parseFeedbackTopics({ title: true })).toBeNull();
  });

  it('returns null when any element is outside the known topic set', () => {
    expect(parseFeedbackTopics(['title', 'totally-not-a-topic'])).toBeNull();
  });

  it('deduplicates and sorts known topics for stable output', () => {
    // Stable output makes downstream comparisons (snapshots, no-op
    // diff checks in the mutation layer) order-independent.
    expect(parseFeedbackTopics(['description', 'title', 'title'])).toEqual([
      'description',
      'title',
    ]);
  });
});

describe('validateChunkMutationData — feedback topics', () => {
  it('accepts a payload with no feedback topics', () => {
    const result = validateChunkMutationData({ ...base() });
    expect(result).toBeNull();
  });

  it('accepts a payload with the known topics', () => {
    const result = validateChunkMutationData({
      ...base(),
      feedbackTopics: ['title', 'description'],
    });
    expect(result).toBeNull();
  });

  it('rejects unknown topic values', () => {
    const result = validateChunkMutationData({
      ...base(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      feedbackTopics: ['title', 'fen'] as any,
    });
    expect(result).toMatch(/Invalid feedback topic/);
  });
});
