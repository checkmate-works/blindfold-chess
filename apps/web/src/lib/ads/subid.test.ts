import { describe, expect, it } from 'vitest';

import { withCreativeSubId } from './subid';

const ID = '3f1c2b7a-9d44-4e21-8f0a-5c6b7d8e9f01';

describe('withCreativeSubId', () => {
  it('tags an Awin click URL with clickref', () => {
    expect(withCreativeSubId('https://awin1.com/cread.php?awinmid=1234&awinaffid=5678', ID)).toBe(
      `https://awin1.com/cread.php?awinmid=1234&awinaffid=5678&clickref=${ID}`
    );
  });

  it('uses ? when the URL has no query yet', () => {
    expect(withCreativeSubId('https://www.awin1.com/cread.php', ID)).toBe(
      `https://www.awin1.com/cread.php?clickref=${ID}`
    );
  });

  it("leaves Awin's percent-encoded destination byte-for-byte intact", () => {
    // `ued` carries the real destination. Rebuilding the query through
    // URLSearchParams would re-encode it, which is how a link that still
    // renders fine stops crediting the sale.
    const ued = 'https%3A%2F%2Fforwardchess.com%2Fproduct%2Fsome-book%3Fa%3D1%26b%3D2';
    const href = `https://www.awin1.com/cread.php?awinmid=1&awinaffid=2&ued=${ued}`;

    const tagged = withCreativeSubId(href, ID);

    expect(tagged).toBe(`${href}&clickref=${ID}`);
    expect(tagged).toContain(`ued=${ued}`);
  });

  it('never adds a second clickref to a URL that already carries one', () => {
    // The admin form rejects these on the way in; this is the last line of
    // defence for a row written before that check existed.
    const href = 'https://awin1.com/cread.php?awinmid=1&clickref=spring-campaign';
    expect(withCreativeSubId(href, ID)).toBe(href);
  });

  it('appends before the fragment so the anchor still resolves', () => {
    expect(withCreativeSubId('https://awin1.com/cread.php?awinmid=1#reviews', ID)).toBe(
      `https://awin1.com/cread.php?awinmid=1&clickref=${ID}#reviews`
    );
  });

  it('leaves an unknown network untouched', () => {
    const href = 'https://forwardchess.com/product/some-book';
    expect(withCreativeSubId(href, ID)).toBe(href);
  });

  it('does not match a look-alike host that merely contains the network name', () => {
    const href = 'https://awin1.com.evil.example.com/cread.php?awinmid=1';
    expect(withCreativeSubId(href, ID)).toBe(href);
  });

  it('returns a non-absolute href unchanged instead of throwing', () => {
    expect(withCreativeSubId('/internal/page', ID)).toBe('/internal/page');
    expect(withCreativeSubId('', ID)).toBe('');
  });
});
