import { SUPPORTED_LOCALES } from '@/config';
import { describe, expect, it } from 'vitest';

import { LANGUAGE_TAGS } from './language-tags';

/**
 * Runtime backstop for the compile-time `Record<Locale, string>` guarantee
 * on LANGUAGE_TAGS. TypeScript alone catches the case where a contributor
 * adds a locale to SUPPORTED_LOCALES and forgets LANGUAGE_TAGS; this test
 * provides a clear regression signal when someone `as`-casts around the
 * type system.
 */
describe('LANGUAGE_TAGS', () => {
  it('defines an entry for every supported locale (keys match SUPPORTED_LOCALES)', () => {
    expect(Object.keys(LANGUAGE_TAGS).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it('maps every entry to a non-empty BCP 47 language tag', () => {
    // BCP 47 primary language subtag is 2-3 lowercase letters, optionally
    // followed by a hyphenated region subtag of 2 uppercase letters or 3
    // digits. Covers the full set we ship (`en-US`, `es-ES`, `pt-BR`,
    // `ja-JP`) plus headroom for future additions like `zh-TW` or `es-419`.
    const bcp47 = /^[a-z]{2,3}(-[A-Z]{2}|-[0-9]{3})?$/;

    for (const [locale, tag] of Object.entries(LANGUAGE_TAGS)) {
      expect(tag, `LANGUAGE_TAGS[${locale}] must be non-empty`).toBeTruthy();
      expect(bcp47.test(tag), `LANGUAGE_TAGS[${locale}] = "${tag}" must match BCP 47 shape`).toBe(
        true
      );
    }
  });
});
