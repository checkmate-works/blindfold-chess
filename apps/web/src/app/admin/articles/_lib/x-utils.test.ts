import { describe, expect, it } from 'vitest';

import { extractTweetId, extractXUsername } from './x-utils';

describe('extractTweetId', () => {
  it('should extract tweet ID from x.com URL', () => {
    expect(extractTweetId('https://x.com/username/status/1234567890123456789')).toBe(
      '1234567890123456789'
    );
  });

  it('should extract tweet ID from twitter.com URL', () => {
    expect(extractTweetId('https://twitter.com/username/status/1234567890123456789')).toBe(
      '1234567890123456789'
    );
  });

  it('should return null for invalid URL', () => {
    expect(extractTweetId('not-a-url')).toBeNull();
  });

  it('should return null for non-X URL', () => {
    expect(extractTweetId('https://example.com/username/status/123')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractTweetId('')).toBeNull();
  });

  it('should return null for X URL without status', () => {
    expect(extractTweetId('https://x.com/username')).toBeNull();
  });

  it('should handle URL with query parameters', () => {
    expect(extractTweetId('https://x.com/user/status/1234567890?s=20&t=abc')).toBe('1234567890');
  });
});

describe('extractXUsername', () => {
  it('should extract username from x.com URL', () => {
    expect(extractXUsername('https://x.com/johndoe/status/1234567890')).toBe('johndoe');
  });

  it('should extract username from twitter.com URL', () => {
    expect(extractXUsername('https://twitter.com/janedoe/status/1234567890')).toBe('janedoe');
  });

  it('should return null for invalid URL', () => {
    expect(extractXUsername('not-a-url')).toBeNull();
  });

  it('should return null for non-X URL', () => {
    expect(extractXUsername('https://example.com/user/status/123')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractXUsername('')).toBeNull();
  });

  it('should return null for X URL without status path', () => {
    expect(extractXUsername('https://x.com/username')).toBeNull();
  });
});
