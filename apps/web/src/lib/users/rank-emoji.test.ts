import { describe, expect, it } from 'vitest';

import { MEDAL_EMOJI, getMedalEmoji } from './rank-emoji';

describe('MEDAL_EMOJI', () => {
  it('should define exactly three medal entries', () => {
    expect(Object.keys(MEDAL_EMOJI)).toHaveLength(3);
  });

  it('should map rank 1 to gold medal', () => {
    expect(MEDAL_EMOJI[1]).toBe('\u{1F947}');
  });

  it('should map rank 2 to silver medal', () => {
    expect(MEDAL_EMOJI[2]).toBe('\u{1F948}');
  });

  it('should map rank 3 to bronze medal', () => {
    expect(MEDAL_EMOJI[3]).toBe('\u{1F949}');
  });
});

describe('getMedalEmoji', () => {
  it('should return gold medal emoji for rank 1', () => {
    expect(getMedalEmoji(1)).toBe('\u{1F947}');
  });

  it('should return silver medal emoji for rank 2', () => {
    expect(getMedalEmoji(2)).toBe('\u{1F948}');
  });

  it('should return bronze medal emoji for rank 3', () => {
    expect(getMedalEmoji(3)).toBe('\u{1F949}');
  });

  it('should return null for rank 4', () => {
    expect(getMedalEmoji(4)).toBeNull();
  });

  it('should return null for rank 0', () => {
    expect(getMedalEmoji(0)).toBeNull();
  });

  it('should return null for negative ranks', () => {
    expect(getMedalEmoji(-1)).toBeNull();
  });

  it('should return null for large rank numbers', () => {
    expect(getMedalEmoji(100)).toBeNull();
  });
});
