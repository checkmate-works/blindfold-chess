import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import LeaderboardIndexRedirect from './page';

const mockPermanentRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock('next/navigation', () => ({
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
}));

async function invoke(locale: Locale, period?: string | string[] | undefined): Promise<string> {
  try {
    await LeaderboardIndexRedirect({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({ period }),
    });
  } catch {
    // expected — permanentRedirect throws in the mock
  }
  expect(mockPermanentRedirect).toHaveBeenCalledTimes(1);
  const url = mockPermanentRedirect.mock.calls[0][0];
  return url;
}

beforeEach(() => {
  mockPermanentRedirect.mockClear();
});

describe('LeaderboardIndexRedirect', () => {
  describe('period query param handling', () => {
    it.each([
      { period: 'weekly', expected: '/en/leaderboard/score/weekly' },
      { period: 'monthly', expected: '/en/leaderboard/score/monthly' },
      { period: 'all-time', expected: '/en/leaderboard/score/all-time' },
    ])('redirects ?period=$period → $expected', async ({ period, expected }) => {
      const url = await invoke('en', period);
      expect(url).toBe(expected);
    });

    it('defaults to all-time when period is omitted', async () => {
      const url = await invoke('en', undefined);
      expect(url).toBe('/en/leaderboard/score/all-time');
    });

    it('falls back to all-time for invalid period value', async () => {
      const url = await invoke('en', 'daily');
      expect(url).toBe('/en/leaderboard/score/all-time');
    });

    it('falls back to all-time for empty string period', async () => {
      const url = await invoke('en', '');
      expect(url).toBe('/en/leaderboard/score/all-time');
    });

    it('extracts first element when period is an array (weekly wins over monthly)', async () => {
      const url = await invoke('en', ['weekly', 'monthly']);
      expect(url).toBe('/en/leaderboard/score/weekly');
    });

    it('falls back when first element of array is invalid', async () => {
      const url = await invoke('en', ['daily', 'weekly']);
      expect(url).toBe('/en/leaderboard/score/all-time');
    });

    it('falls back when array is empty', async () => {
      const url = await invoke('en', []);
      expect(url).toBe('/en/leaderboard/score/all-time');
    });
  });

  describe('locale variants', () => {
    it.each(['en', 'ja', 'es'] as const)(
      'preserves locale=%s in redirect target',
      async (locale) => {
        const url = await invoke(locale, 'weekly');
        expect(url).toBe(`/${locale}/leaderboard/score/weekly`);
      }
    );
  });
});
