import { SUPPORTED_LOCALES } from '@/config';
import { describe, expect, it } from 'vitest';

import { OG_LOCALE_MAP } from './og-locale';

/**
 * Runtime backstop for the compile-time `Record<Locale, string>` guarantee
 * on OG_LOCALE_MAP. Parallels the coverage in `language-tags.test.ts` but
 * for the Open Graph (underscore-separated) flavour.
 */
describe('OG_LOCALE_MAP', () => {
  it('defines an entry for every supported locale (keys match SUPPORTED_LOCALES)', () => {
    expect(Object.keys(OG_LOCALE_MAP).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it('maps every entry to a non-empty underscore-separated OG locale code', () => {
    // Open Graph uses underscore instead of hyphen: `en_US`, `pt_BR`, `ja_JP`.
    // Primary subtag: 2-3 lowercase letters. Optional region subtag: 2
    // uppercase letters or 3 digits after an underscore.
    const ogLocale = /^[a-z]{2,3}(_[A-Z]{2}|_[0-9]{3})?$/;

    for (const [locale, code] of Object.entries(OG_LOCALE_MAP)) {
      expect(code, `OG_LOCALE_MAP[${locale}] must be non-empty`).toBeTruthy();
      expect(
        ogLocale.test(code),
        `OG_LOCALE_MAP[${locale}] = "${code}" must match the OG underscore-separated shape`
      ).toBe(true);
    }
  });
});
