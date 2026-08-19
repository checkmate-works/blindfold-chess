/**
 * Redirect tests for the legacy exp leaderboard shim
 * (`/leaderboard/[period]/exp` → `/leaderboard/exp/[period]`).
 */
import { notFound, permanentRedirect } from 'next/navigation';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import LegacyExpLeaderboardRedirect from './page';

vi.mock('next/navigation');

async function invoke(
  locale: Locale,
  period: string
): Promise<{ redirect?: string; notFound: boolean }> {
  try {
    await LegacyExpLeaderboardRedirect({
      params: Promise.resolve({ locale, period }),
    });
  } catch {
    // expected — permanentRedirect / notFound throw in the mocks
  }
  if (vi.mocked(notFound).mock.calls.length > 0) {
    return { notFound: true };
  }
  return { redirect: vi.mocked(permanentRedirect).mock.calls[0][0], notFound: false };
}

beforeEach(() => {
  vi.mocked(permanentRedirect).mockClear();
  vi.mocked(notFound).mockClear();
});

describe('LegacyExpLeaderboardRedirect', () => {
  describe('strict period validation', () => {
    it('calls notFound() for an invalid period', async () => {
      const result = await invoke('en', 'daily');
      expect(result.notFound).toBe(true);
      expect(vi.mocked(permanentRedirect)).not.toHaveBeenCalled();
    });

    it('calls notFound() for an empty period', async () => {
      const result = await invoke('en', '');
      expect(result.notFound).toBe(true);
    });
  });

  describe('period → canonical exp redirect', () => {
    it.each([
      { period: 'weekly', expected: '/en/leaderboard/exp/weekly' },
      { period: 'monthly', expected: '/en/leaderboard/exp/monthly' },
      { period: 'all-time', expected: '/en/leaderboard/exp/all-time' },
    ])('redirects period=$period → $expected', async ({ period, expected }) => {
      const result = await invoke('en', period);
      expect(result.redirect).toBe(expected);
    });
  });

  describe('locale variants', () => {
    it.each(['en', 'ja', 'es'] as const)(
      'preserves locale=%s in redirect target',
      async (locale) => {
        const result = await invoke(locale, 'monthly');
        expect(result.redirect).toBe(`/${locale}/leaderboard/exp/monthly`);
      }
    );
  });
});
