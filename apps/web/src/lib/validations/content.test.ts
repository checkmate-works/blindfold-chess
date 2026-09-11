import { describe, expect, it } from 'vitest';

import { MAX_CONTENT_LENGTH, validateContent, validateContentValue } from './content';

describe('validateContentValue', () => {
  it('returns contentRequired for a missing or non-string value', () => {
    expect(validateContentValue(null)).toEqual({ error: 'contentRequired' });
    expect(validateContentValue(undefined)).toEqual({ error: 'contentRequired' });
    expect(validateContentValue(42)).toEqual({ error: 'contentRequired' });
  });

  it('returns contentRequired for an empty or whitespace-only string', () => {
    expect(validateContentValue('')).toEqual({ error: 'contentRequired' });
    expect(validateContentValue('   \t\n  ')).toEqual({ error: 'contentRequired' });
  });

  it('returns the trimmed content', () => {
    expect(validateContentValue('  hello  ')).toEqual({ content: 'hello' });
  });

  it('accepts content at exactly MAX_CONTENT_LENGTH', () => {
    const body = 'a'.repeat(MAX_CONTENT_LENGTH);
    expect(validateContentValue(body)).toEqual({ content: body });
  });

  it('returns contentTooLong when the trimmed content exceeds MAX_CONTENT_LENGTH', () => {
    expect(validateContentValue('a'.repeat(MAX_CONTENT_LENGTH + 1))).toEqual({
      error: 'contentTooLong',
    });
  });

  // The stored value is the trimmed one, so surrounding whitespace must not
  // count towards the limit.
  it('measures the limit after trimming', () => {
    const body = 'a'.repeat(MAX_CONTENT_LENGTH - 2);
    expect(validateContentValue(`${body}     `)).toEqual({ content: body });
    expect(validateContentValue(`  ${body}  `)).toEqual({ content: body });
  });

  it('still rejects an over-limit body wrapped in whitespace', () => {
    expect(validateContentValue(`  ${'a'.repeat(MAX_CONTENT_LENGTH + 1)}  `)).toEqual({
      error: 'contentTooLong',
    });
  });
});

describe('validateContent', () => {
  function makeFormData(content?: string): FormData {
    const fd = new FormData();
    if (content !== undefined) fd.set('content', content);
    return fd;
  }

  it('returns contentRequired when the content field is missing', () => {
    expect(validateContent(makeFormData())).toEqual({ error: 'contentRequired' });
  });

  it('returns contentRequired when the content field is whitespace only', () => {
    expect(validateContent(makeFormData('   '))).toEqual({ error: 'contentRequired' });
  });

  it('returns the trimmed content from the content field', () => {
    expect(validateContent(makeFormData('  hello  '))).toEqual({ content: 'hello' });
  });

  it('accepts 1998 characters followed by five spaces', () => {
    const body = 'a'.repeat(1998);
    expect(validateContent(makeFormData(`${body}     `))).toEqual({ content: body });
  });

  it('returns contentTooLong when the trimmed content exceeds MAX_CONTENT_LENGTH', () => {
    expect(validateContent(makeFormData('a'.repeat(MAX_CONTENT_LENGTH + 1)))).toEqual({
      error: 'contentTooLong',
    });
  });
});
