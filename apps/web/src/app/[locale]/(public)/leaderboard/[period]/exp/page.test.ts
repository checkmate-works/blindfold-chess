/**
 * Redirect tests for the legacy exp leaderboard shim
 * (`/leaderboard/[period]/exp` → `/leaderboard/exp/[period]`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import LegacyExpLeaderboardRedirect from './page';

const mockPermanentRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('next/navigation', () => ({
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
  notFound: () => mockNotFound(),
}));

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
  if (mockNotFound.mock.calls.length > 0) {
    return { notFound: true };
  }
  return { redirect: mockPermanentRedirect.mock.calls[0][0], notFound: false };
}

beforeEach(() => {
  mockPermanentRedirect.mockClear();
  mockNotFound.mockClear();
});

describe('LegacyExpLeaderboardRedirect', () => {
  describe('strict period validation', () => {
    it('calls notFound() for an invalid period', async () => {
      const result = await invoke('en', 'daily');
      expect(result.notFound).toBe(true);
      expect(mockPermanentRedirect).not.toHaveBeenCalled();
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
