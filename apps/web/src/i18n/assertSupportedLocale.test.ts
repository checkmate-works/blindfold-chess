import { SUPPORTED_LOCALES } from '@/config';
import { describe, expect, it } from 'vitest';

import { assertSupportedLocale } from './assertSupportedLocale';

describe('assertSupportedLocale', () => {
  it('accepts every locale listed in SUPPORTED_LOCALES', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(() => assertSupportedLocale(locale)).not.toThrow();
    }
  });

  it('throws on an unknown locale string', () => {
    expect(() => assertSupportedLocale('fr')).toThrow(/Unsupported locale/);
    expect(() => assertSupportedLocale('zh-CN')).toThrow(/Unsupported locale/);
  });

  it('throws on the empty string', () => {
    expect(() => assertSupportedLocale('')).toThrow(/Unsupported locale/);
  });

  it('throws on a prototype-polluting string (defensive sanity check)', () => {
    // `__proto__` would only cause issues if we used the raw value as an
    // object key, but the assertion should reject it regardless because it
    // is not a supported locale.
    expect(() => assertSupportedLocale('__proto__')).toThrow(/Unsupported locale/);
    expect(() => assertSupportedLocale('constructor')).toThrow(/Unsupported locale/);
  });

  it('rejects path-traversal-shaped strings that could flow into revalidatePath', () => {
    expect(() => assertSupportedLocale('../admin')).toThrow(/Unsupported locale/);
    expect(() => assertSupportedLocale('en/../ja')).toThrow(/Unsupported locale/);
  });
});
