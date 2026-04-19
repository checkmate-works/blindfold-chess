import { describe, expect, it } from 'vitest';

import {
  ADS_HIDDEN_COOKIE_MAX_AGE_SEC,
  ADS_HIDDEN_COOKIE_NAME,
  adsHiddenCookieOptions,
} from './ads-hidden-cookie';

describe('ads-hidden-cookie constants', () => {
  it('exposes the expected cookie name', () => {
    expect(ADS_HIDDEN_COOKIE_NAME).toBe('bfc_ads_hidden');
  });

  it('sets the max-age to 7 days', () => {
    expect(ADS_HIDDEN_COOKIE_MAX_AGE_SEC).toBe(60 * 60 * 24 * 7);
  });
});

describe('adsHiddenCookieOptions', () => {
  it('returns cookie options suitable for the client-read no-flash script', () => {
    const opts = adsHiddenCookieOptions();

    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(ADS_HIDDEN_COOKIE_MAX_AGE_SEC);
    expect(opts.sameSite).toBe('lax');
    expect(opts.httpOnly).toBe(false);
    // `secure` is `!IS_LOCAL_DEV`. In the test environment (NODE_ENV=test
    // and no NEXT_PUBLIC_SITE_URL with "localhost"), `IS_LOCAL_DEV` is false
    // so `secure` should be true.
    expect(opts.secure).toBe(true);
  });
});
