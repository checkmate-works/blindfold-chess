import { describe, expect, it } from 'vitest';

import { parseGuideSegments } from './parseGuideSegments';

describe('parseGuideSegments', () => {
  it('parses a numeric first segment as a flat page', () => {
    expect(parseGuideSegments(['2'])).toEqual({ kind: 'flat-page', page: 2 });
    expect(parseGuideSegments(['8'])).toEqual({ kind: 'flat-page', page: 8 });
  });

  it('parses a string first segment as a chapter root', () => {
    expect(parseGuideSegments(['diagonal'])).toEqual({
      kind: 'chapter-root',
      chapterSlug: 'diagonal',
    });
  });

  it('parses chapter + numeric as a chapter page', () => {
    expect(parseGuideSegments(['maneuvering', '3'])).toEqual({
      kind: 'chapter-page',
      chapterSlug: 'maneuvering',
      page: 3,
    });
  });

  it('rejects empty segments', () => {
    expect(parseGuideSegments([])).toBeNull();
  });

  it('rejects too many segments', () => {
    expect(parseGuideSegments(['a', 'b', 'c'])).toBeNull();
  });

  it('rejects numeric + extra segment', () => {
    expect(parseGuideSegments(['2', 'foo'])).toBeNull();
  });

  it('rejects chapter + non-numeric second segment', () => {
    expect(parseGuideSegments(['chunking', 'foo'])).toBeNull();
  });

  it('rejects invalid chapter slug characters', () => {
    expect(parseGuideSegments(['BadSlug'])).toBeNull();
    expect(parseGuideSegments(['has_underscore'])).toBeNull();
  });

  it('rejects zero or negative pages', () => {
    expect(parseGuideSegments(['0'])).toBeNull();
  });
});
