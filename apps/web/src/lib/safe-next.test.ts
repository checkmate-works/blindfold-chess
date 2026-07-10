import { describe, expect, it } from 'vitest';

import { sanitizeNext } from './safe-next';

describe('sanitizeNext', () => {
  it('accepts same-origin absolute paths', () => {
    expect(sanitizeNext('/en/practice/recall')).toBe('/en/practice/recall');
    expect(sanitizeNext('/en/games/play/result?gameId=abc&x=1')).toBe(
      '/en/games/play/result?gameId=abc&x=1'
    );
  });

  it('rejects protocol-relative and absolute URLs (open-redirect guard)', () => {
    expect(sanitizeNext('//evil.com')).toBeNull();
    expect(sanitizeNext('https://evil.com')).toBeNull();
    expect(sanitizeNext('http://evil.com/path')).toBeNull();
  });

  it('rejects non-path values', () => {
    expect(sanitizeNext('mypage')).toBeNull();
    expect(sanitizeNext('javascript:alert(1)')).toBeNull();
  });

  it('rejects backslash-based protocol-relative bypasses', () => {
    // Browsers fold `\` to `/`, so `/\evil.com` resolves to `//evil.com`.
    expect(sanitizeNext('/\\evil.com')).toBeNull();
    expect(sanitizeNext('\\\\evil.com')).toBeNull();
    expect(sanitizeNext('/\\/evil.com')).toBeNull();
  });

  it('rejects values containing control characters that browsers strip', () => {
    expect(sanitizeNext('\t/\\evil.com')).toBeNull();
    expect(sanitizeNext('\n//evil.com')).toBeNull();
    expect(sanitizeNext('/foo\rbar')).toBeNull();
  });

  it('returns null for empty / missing input', () => {
    expect(sanitizeNext('')).toBeNull();
    expect(sanitizeNext(null)).toBeNull();
    expect(sanitizeNext(undefined)).toBeNull();
  });
});
