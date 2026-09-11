import { describe, expect, it } from 'vitest';

import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import { parseRating, validateOpeningPostContent } from './opening-post-input';

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe('parseRating', () => {
  it('returns the integer for a value in 1-5', () => {
    expect(parseRating('1')).toBe(1);
    expect(parseRating('5')).toBe(5);
  });

  it('returns null for a missing, non-numeric, or out-of-range value', () => {
    expect(parseRating(null)).toBeNull();
    expect(parseRating('')).toBeNull();
    expect(parseRating('abc')).toBeNull();
    expect(parseRating('0')).toBeNull();
    expect(parseRating('6')).toBeNull();
    expect(parseRating('2.5')).toBeNull();
  });
});

describe('validateOpeningPostContent', () => {
  it('returns the trimmed content', () => {
    expect(
      validateOpeningPostContent(makeFormData({ content: '  hello  ' }), 'attachment')
    ).toEqual({ content: 'hello' });
  });

  it('returns contentOrRatingRequired when there is no content, rating, or attachment', () => {
    expect(validateOpeningPostContent(makeFormData({ content: '   ' }), 'attachment')).toEqual({
      error: 'contentOrRatingRequired',
    });
  });

  it('accepts an empty content when a rating is provided', () => {
    expect(
      validateOpeningPostContent(makeFormData({ content: '', preferenceRating: '3' }), 'attachment')
    ).toEqual({ content: '' });
  });

  it('accepts an empty content when the attachment field is provided', () => {
    expect(
      validateOpeningPostContent(
        makeFormData({ attachmentFen: '8/8/8/8/8/8/8/8 w - - 0 1' }),
        'attachmentFen'
      )
    ).toEqual({ content: '' });
  });

  it('accepts content at exactly MAX_CONTENT_LENGTH', () => {
    const body = 'a'.repeat(MAX_CONTENT_LENGTH);
    expect(validateOpeningPostContent(makeFormData({ content: body }), 'attachment')).toEqual({
      content: body,
    });
  });

  // Same rule as every other body surface: the limit is measured after
  // trimming, because the trimmed value is what gets stored.
  it('accepts 1998 characters followed by five spaces', () => {
    const body = 'a'.repeat(1998);
    expect(
      validateOpeningPostContent(makeFormData({ content: `${body}     ` }), 'attachment')
    ).toEqual({ content: body });
  });

  it('returns contentTooLong when the trimmed content exceeds MAX_CONTENT_LENGTH', () => {
    expect(
      validateOpeningPostContent(
        makeFormData({ content: 'a'.repeat(MAX_CONTENT_LENGTH + 1) }),
        'attachment'
      )
    ).toEqual({ error: 'contentTooLong' });
  });

  it('returns contentTooLong even when a rating is also provided', () => {
    expect(
      validateOpeningPostContent(
        makeFormData({ content: 'a'.repeat(MAX_CONTENT_LENGTH + 1), preferenceRating: '3' }),
        'attachment'
      )
    ).toEqual({ error: 'contentTooLong' });
  });
});
