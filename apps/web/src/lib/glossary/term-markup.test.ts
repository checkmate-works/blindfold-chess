import { describe, expect, it } from 'vitest';

import { collectTermSlugs, parseTermMarkup } from './term-markup';

describe('parseTermMarkup', () => {
  it('returns a single text token for plain prose', () => {
    expect(parseTermMarkup('no markup here')).toEqual([{ type: 'text', value: 'no markup here' }]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseTermMarkup('')).toEqual([]);
  });

  it('parses a slug|label token surrounded by text', () => {
    expect(parseTermMarkup('reach the [[tabiya|Tabia]].')).toEqual([
      { type: 'text', value: 'reach the ' },
      { type: 'term', slug: 'tabiya', label: 'Tabia' },
      { type: 'text', value: '.' },
    ]);
  });

  it('uses the slug as the label when no label is given', () => {
    expect(parseTermMarkup('a [[zugzwang]] here')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'term', slug: 'zugzwang', label: 'zugzwang' },
      { type: 'text', value: ' here' },
    ]);
  });

  it('parses multiple tokens in one string', () => {
    expect(parseTermMarkup('[[a|A]] and [[b|B]]')).toEqual([
      { type: 'term', slug: 'a', label: 'A' },
      { type: 'text', value: ' and ' },
      { type: 'term', slug: 'b', label: 'B' },
    ]);
  });

  it('trims whitespace inside the token', () => {
    expect(parseTermMarkup('[[ tabiya | Tabia ]]')).toEqual([
      { type: 'term', slug: 'tabiya', label: 'Tabia' },
    ]);
  });

  it('preserves authored newlines in text tokens', () => {
    expect(parseTermMarkup('line one\nreach [[tabiya|Tabia]]\nline three')).toEqual([
      { type: 'text', value: 'line one\nreach ' },
      { type: 'term', slug: 'tabiya', label: 'Tabia' },
      { type: 'text', value: '\nline three' },
    ]);
  });

  it('leaves malformed markup as literal text', () => {
    expect(parseTermMarkup('empty [[]] and [[|x]] stay literal')).toEqual([
      { type: 'text', value: 'empty [[]] and [[|x]] stay literal' },
    ]);
  });

  it('does not treat a single bracket pair as a token', () => {
    expect(parseTermMarkup('an [array] index')).toEqual([
      { type: 'text', value: 'an [array] index' },
    ]);
  });

  it('is stateless across repeated calls (regex lastIndex reset)', () => {
    const input = 'reach [[tabiya|Tabia]]';
    const first = parseTermMarkup(input);
    const second = parseTermMarkup(input);
    expect(second).toEqual(first);
  });
});

describe('collectTermSlugs', () => {
  it('returns distinct slugs in first-seen order', () => {
    expect(collectTermSlugs('[[b|B]] then [[a|A]] then [[b|again]]')).toEqual(['b', 'a']);
  });

  it('returns an empty array when there is no markup', () => {
    expect(collectTermSlugs('plain prose')).toEqual([]);
  });
});
