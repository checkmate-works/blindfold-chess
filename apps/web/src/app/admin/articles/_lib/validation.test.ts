import { describe, expect, it } from 'vitest';

import { validateArticleData } from './validation';

const validData = {
  slug: 'test-article',
  title: 'Test Article',
  content: 'This is a test article.',
  locale: 'en',
  status: 'draft',
  publishedAt: null,
  icon: null,
};

describe('validateArticleData', () => {
  it('should return null for valid data', () => {
    expect(validateArticleData(validData)).toBeNull();
  });

  it('should return error when slug is empty', () => {
    expect(validateArticleData({ ...validData, slug: '' })).toBe('invalid slug');
  });

  it('should return error when slug exceeds 255 characters', () => {
    expect(validateArticleData({ ...validData, slug: 'a'.repeat(256) })).toBe('invalid slug');
  });

  it('should accept slug of exactly 255 characters', () => {
    expect(validateArticleData({ ...validData, slug: 'a'.repeat(255) })).toBeNull();
  });

  it('should return error when title is empty', () => {
    expect(validateArticleData({ ...validData, title: '' })).toBe('invalid title');
  });

  it('should return error when title exceeds 255 characters', () => {
    expect(validateArticleData({ ...validData, title: 'a'.repeat(256) })).toBe('invalid title');
  });

  it('should accept title of exactly 255 characters', () => {
    expect(validateArticleData({ ...validData, title: 'a'.repeat(255) })).toBeNull();
  });

  it('should return error when content is empty', () => {
    expect(validateArticleData({ ...validData, content: '' })).toBe('invalid content');
  });

  it('should return error when locale is empty', () => {
    expect(validateArticleData({ ...validData, locale: '' })).toBe('invalid locale');
  });

  it('should return error when locale exceeds 10 characters', () => {
    expect(validateArticleData({ ...validData, locale: 'a'.repeat(11) })).toBe('invalid locale');
  });

  it('should accept locale of exactly 10 characters', () => {
    expect(validateArticleData({ ...validData, locale: 'a'.repeat(10) })).toBeNull();
  });

  it('should return error when status is invalid', () => {
    expect(validateArticleData({ ...validData, status: 'invalid' })).toBe('invalid status');
  });

  it('should return error when status is empty', () => {
    expect(validateArticleData({ ...validData, status: '' })).toBe('invalid status');
  });

  it('should return error when published without publishedAt', () => {
    expect(validateArticleData({ ...validData, status: 'published', publishedAt: null })).toBe(
      'Published date is required when status is published'
    );
  });

  it('should accept published with publishedAt', () => {
    expect(
      validateArticleData({
        ...validData,
        status: 'published',
        publishedAt: '2024-06-15T12:00:00Z',
      })
    ).toBeNull();
  });

  it('should return error when icon exceeds 10 characters', () => {
    expect(validateArticleData({ ...validData, icon: 'a'.repeat(11) })).toBe('invalid icon');
  });

  it('should accept icon of exactly 10 characters', () => {
    expect(validateArticleData({ ...validData, icon: 'a'.repeat(10) })).toBeNull();
  });

  it('should accept null icon', () => {
    expect(validateArticleData({ ...validData, icon: null })).toBeNull();
  });

  it('should accept slug of exactly 1 character', () => {
    expect(validateArticleData({ ...validData, slug: 'a' })).toBeNull();
  });

  it('should accept draft status without publishedAt', () => {
    expect(validateArticleData({ ...validData, status: 'draft', publishedAt: null })).toBeNull();
  });

  it('should accept long content', () => {
    expect(validateArticleData({ ...validData, content: 'x'.repeat(100000) })).toBeNull();
  });

  it('should accept empty string icon as valid (falsy check)', () => {
    expect(validateArticleData({ ...validData, icon: '' })).toBeNull();
  });

  it('should accept locale of exactly 1 character', () => {
    expect(validateArticleData({ ...validData, locale: 'e' })).toBeNull();
  });

  it('should accept title of exactly 1 character', () => {
    expect(validateArticleData({ ...validData, title: 'T' })).toBeNull();
  });

  // contentFormat validation tests
  describe('contentFormat validation', () => {
    it('should allow empty content when contentFormat is tiptap_json', () => {
      expect(
        validateArticleData({ ...validData, content: '', contentFormat: 'tiptap_json' })
      ).toBeNull();
    });

    it('should return error when content is empty and contentFormat is markdown', () => {
      expect(validateArticleData({ ...validData, content: '', contentFormat: 'markdown' })).toBe(
        'invalid content'
      );
    });

    it('should return error when content is empty and contentFormat is undefined (default)', () => {
      expect(validateArticleData({ ...validData, content: '' })).toBe('invalid content');
    });

    it('should return error for invalid contentFormat value', () => {
      expect(
        validateArticleData({
          ...validData,
          contentFormat: 'html' as 'markdown',
        })
      ).toBe('invalid content format');
    });

    it('should skip contentFormat validation when contentFormat is empty string (falsy)', () => {
      // NOTE: Empty string contentFormat is treated as falsy and skips the
      // VALID_CONTENT_FORMATS check. This may be intentional (equivalent to
      // undefined/not provided), but if empty string should be rejected,
      // the condition in validation.ts needs to change from
      // `if (data.contentFormat && ...)` to
      // `if (data.contentFormat !== undefined && ...)`.
      expect(
        validateArticleData({
          ...validData,
          contentFormat: '' as 'markdown',
        })
      ).toBeNull();
    });

    it('should accept valid markdown contentFormat with content', () => {
      expect(
        validateArticleData({ ...validData, content: '# Hello', contentFormat: 'markdown' })
      ).toBeNull();
    });

    it('should accept valid tiptap_json contentFormat with content', () => {
      expect(
        validateArticleData({
          ...validData,
          content: 'Some text',
          contentFormat: 'tiptap_json',
        })
      ).toBeNull();
    });

    it('should accept data without contentFormat (undefined)', () => {
      expect(validateArticleData({ ...validData })).toBeNull();
    });
  });
});
