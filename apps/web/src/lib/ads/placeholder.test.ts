import { describe, expect, it } from 'vitest';

import { PLACEHOLDER_AD_HREF, isPlaceholderAdHref } from './placeholder';

describe('isPlaceholderAdHref', () => {
  it('recognizes the href the seed writes', () => {
    expect(isPlaceholderAdHref(PLACEHOLDER_AD_HREF)).toBe(true);
  });

  it('recognizes a documentation host the admin has part-way edited', () => {
    // Swapping the path while leaving the host is exactly as unready as not
    // having started, which is why the test is on the host and not on an
    // exact match against the constant.
    expect(isPlaceholderAdHref('https://example.com/some-book')).toBe(true);
    expect(isPlaceholderAdHref('http://www.example.org/x?y=1')).toBe(true);
    expect(isPlaceholderAdHref('https://EXAMPLE.NET/x')).toBe(true);
    expect(isPlaceholderAdHref('https://shop.example/x')).toBe(true);
  });

  it('accepts a real destination, including one that merely contains the word', () => {
    expect(isPlaceholderAdHref('https://awin1.com/cread.php?awinmid=1&awinaffid=2')).toBe(false);
    expect(isPlaceholderAdHref('https://example.company.co.jp/book')).toBe(false);
    expect(isPlaceholderAdHref('https://shop.jp/example.com')).toBe(false);
  });

  it('leaves an unparseable href to the href validator', () => {
    // Not a placeholder, just invalid — reporting it as a placeholder would
    // send the admin looking for a URL to replace that is not there.
    expect(isPlaceholderAdHref('/internal/page')).toBe(false);
    expect(isPlaceholderAdHref('')).toBe(false);
  });
});
