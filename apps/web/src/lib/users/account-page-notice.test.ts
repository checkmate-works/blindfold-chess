import en from '@/messages/en.json';
import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_PAGE_NOTICES,
  accountPageHref,
  readAccountPageNotice,
} from './account-page-notice';

describe('accountPageHref / readAccountPageNotice', () => {
  it('round-trips every notice through the URL', () => {
    for (const notice of ACCOUNT_PAGE_NOTICES) {
      const href = accountPageHref('ja', notice);
      const url = new URL(href, 'http://localhost');
      expect(url.pathname).toBe('/ja/mypage/account');
      expect(readAccountPageNotice(Object.fromEntries(url.searchParams))).toBe(notice);
    }
  });

  it('returns undefined for no notice, an unknown value, or an array', () => {
    expect(accountPageHref('en')).toBe('/en/mypage/account');
    expect(readAccountPageNotice({})).toBeUndefined();
    expect(readAccountPageNotice({ notice: 'hacked' })).toBeUndefined();
    expect(readAccountPageNotice({ notice: ['linkedGoogle'] })).toBeUndefined();
  });

  it.each(ACCOUNT_PAGE_NOTICES)('%s has a sentence in the dictionary', (notice) => {
    expect(en.MypageAccount.notices[notice]).toBeTruthy();
  });
});
