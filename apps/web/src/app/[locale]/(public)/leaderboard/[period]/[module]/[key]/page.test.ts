/**
 * Redirect tests for the legacy score detail shim
 * (`/leaderboard/[period]/[module]/[key]` → `/leaderboard/score/[period]/[module-slug]/[key]`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import LegacyLeaderboardDetailRedirect from './page';

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
  period: string,
  moduleSlug: string,
  key: string,
  page?: string | string[] | undefined
): Promise<{ redirect?: string; notFound: boolean }> {
  try {
    await LegacyLeaderboardDetailRedirect({
      params: Promise.resolve({ locale, period, module: moduleSlug, key }),
      searchParams: Promise.resolve({ page }),
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

describe('LegacyLeaderboardDetailRedirect', () => {
  describe('strict validation', () => {
    it('calls notFound() for an invalid period', async () => {
      const result = await invoke('en', 'daily', 'coordinate-quiz', 'white');
      expect(result.notFound).toBe(true);
      expect(mockPermanentRedirect).not.toHaveBeenCalled();
    });

    it('calls notFound() for an unknown module slug', async () => {
      const result = await invoke('en', 'weekly', 'unknown-module', 'white');
      expect(result.notFound).toBe(true);
    });

    it('calls notFound() for underscore-form module (legacy shape rejected)', async () => {
      const result = await invoke('en', 'weekly', 'coordinate_quiz', 'white');
      expect(result.notFound).toBe(true);
    });

    it('calls notFound() for a key that does not belong to the module', async () => {
      // 'king' belongs to legal-moves, not coordinate-quiz
      const result = await invoke('en', 'weekly', 'coordinate-quiz', 'king');
      expect(result.notFound).toBe(true);
    });
  });

  describe('canonical redirect', () => {
    it('redirects weekly coordinate-quiz white → canonical', async () => {
      const result = await invoke('en', 'weekly', 'coordinate-quiz', 'white');
      expect(result.redirect).toBe('/en/leaderboard/score/weekly/coordinate-quiz/white');
    });

    it('redirects monthly legal-moves knight → canonical', async () => {
      const result = await invoke('en', 'monthly', 'legal-moves', 'knight');
      expect(result.redirect).toBe('/en/leaderboard/score/monthly/legal-moves/knight');
    });

    it('redirects all-time route-planner bishop → canonical', async () => {
      const result = await invoke('en', 'all-time', 'route-planner', 'bishop');
      expect(result.redirect).toBe('/en/leaderboard/score/all-time/route-planner/bishop');
    });
  });

  describe('preserves ?page= on redirect', () => {
    it('appends ?page=3 to the canonical target', async () => {
      const result = await invoke('en', 'weekly', 'coordinate-quiz', 'white', '3');
      expect(result.redirect).toBe('/en/leaderboard/score/weekly/coordinate-quiz/white?page=3');
    });

    it('omits ?page= when not provided', async () => {
      const result = await invoke('en', 'weekly', 'coordinate-quiz', 'white');
      expect(result.redirect).toBe('/en/leaderboard/score/weekly/coordinate-quiz/white');
    });

    it('encodes suspicious page values', async () => {
      const result = await invoke('en', 'weekly', 'coordinate-quiz', 'white', '2 3');
      expect(result.redirect).toBe('/en/leaderboard/score/weekly/coordinate-quiz/white?page=2%203');
    });

    it('extracts first element when page is an array', async () => {
      const result = await invoke('en', 'weekly', 'coordinate-quiz', 'white', ['5', '9']);
      expect(result.redirect).toBe('/en/leaderboard/score/weekly/coordinate-quiz/white?page=5');
    });
  });

  describe('locale variants', () => {
    it.each(['en', 'ja', 'es'] as const)(
      'preserves locale=%s in redirect target',
      async (locale) => {
        const result = await invoke(locale, 'weekly', 'coordinate-quiz', 'white');
        expect(result.redirect).toBe(`/${locale}/leaderboard/score/weekly/coordinate-quiz/white`);
      }
    );
  });
});
