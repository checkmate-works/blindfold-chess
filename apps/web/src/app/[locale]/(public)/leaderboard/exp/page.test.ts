import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import ExpLeaderboardIndexRedirect from './page';

const mockPermanentRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock('next/navigation', () => ({
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
}));

async function invoke(locale: Locale, period?: string | string[] | undefined): Promise<string> {
  try {
    await ExpLeaderboardIndexRedirect({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({ period }),
    });
  } catch {
    // expected — permanentRedirect throws in the mock
  }
  expect(mockPermanentRedirect).toHaveBeenCalledTimes(1);
  return mockPermanentRedirect.mock.calls[0][0];
}

beforeEach(() => {
  mockPermanentRedirect.mockClear();
});

describe('ExpLeaderboardIndexRedirect', () => {
  describe('period query param handling', () => {
    it.each([
      { period: 'weekly', expected: '/en/leaderboard/exp/weekly' },
      { period: 'monthly', expected: '/en/leaderboard/exp/monthly' },
      { period: 'all-time', expected: '/en/leaderboard/exp/all-time' },
    ])('redirects ?period=$period → $expected', async ({ period, expected }) => {
      const url = await invoke('en', period);
      expect(url).toBe(expected);
    });

    it('defaults to all-time when period is omitted', async () => {
      const url = await invoke('en', undefined);
      expect(url).toBe('/en/leaderboard/exp/all-time');
    });

    it('falls back to all-time for invalid period value', async () => {
      const url = await invoke('en', 'daily');
      expect(url).toBe('/en/leaderboard/exp/all-time');
    });

    it('falls back to all-time for empty string period', async () => {
      const url = await invoke('en', '');
      expect(url).toBe('/en/leaderboard/exp/all-time');
    });

    it('extracts first element when period is an array (weekly wins over monthly)', async () => {
      const url = await invoke('en', ['weekly', 'monthly']);
      expect(url).toBe('/en/leaderboard/exp/weekly');
    });

    it('falls back when array is empty', async () => {
      const url = await invoke('en', []);
      expect(url).toBe('/en/leaderboard/exp/all-time');
    });
  });

  describe('locale variants', () => {
    it.each(['en', 'ja', 'es'] as const)(
      'preserves locale=%s in redirect target',
      async (locale) => {
        const url = await invoke(locale, 'monthly');
        expect(url).toBe(`/${locale}/leaderboard/exp/monthly`);
      }
    );
  });
});
