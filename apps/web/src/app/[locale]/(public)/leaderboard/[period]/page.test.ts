/**
 * Redirect tests for the legacy score leaderboard shim
 * (`/leaderboard/[period]` → `/leaderboard/score/[period]`).
 *
 * Covers:
 *  - strict period validation (notFound on invalid)
 *  - reserved-category-segment defense (`score`/`exp` → notFound)
 *  - `?module=` absorption into middle-hub path segment
 *  - plain period-only redirect when `?module=` is absent or invalid
 *  - locale passthrough
 */
import { notFound, permanentRedirect } from 'next/navigation';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import LegacyLeaderboardPeriodRedirect from './page';

vi.mock('next/navigation');

async function invoke(
  locale: Locale,
  period: string,
  module?: string | string[] | undefined
): Promise<{ redirect?: string; notFound: boolean }> {
  try {
    await LegacyLeaderboardPeriodRedirect({
      params: Promise.resolve({ locale, period }),
      searchParams: Promise.resolve({ module }),
    });
  } catch {
    // expected — permanentRedirect / notFound throw in the mocks
  }
  const redirectCalls = vi.mocked(permanentRedirect).mock.calls;
  const notFoundCalls = vi.mocked(notFound).mock.calls;
  if (notFoundCalls.length > 0) {
    return { notFound: true };
  }
  return { redirect: redirectCalls[0][0], notFound: false };
}

beforeEach(() => {
  vi.mocked(permanentRedirect).mockClear();
  vi.mocked(notFound).mockClear();
});

describe('LegacyLeaderboardPeriodRedirect', () => {
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

    it('calls notFound() for the reserved "score" segment', async () => {
      const result = await invoke('en', 'score');
      expect(result.notFound).toBe(true);
      expect(vi.mocked(permanentRedirect)).not.toHaveBeenCalled();
    });

    it('calls notFound() for the reserved "exp" segment', async () => {
      const result = await invoke('en', 'exp');
      expect(result.notFound).toBe(true);
      expect(vi.mocked(permanentRedirect)).not.toHaveBeenCalled();
    });
  });

  describe('plain period redirect', () => {
    it.each([
      { period: 'weekly', expected: '/en/leaderboard/score/weekly' },
      { period: 'monthly', expected: '/en/leaderboard/score/monthly' },
      { period: 'all-time', expected: '/en/leaderboard/score/all-time' },
    ])('redirects period=$period → $expected', async ({ period, expected }) => {
      const result = await invoke('en', period);
      expect(result.redirect).toBe(expected);
    });

    it('ignores an unknown module param', async () => {
      const result = await invoke('en', 'weekly', 'unknown_module');
      expect(result.redirect).toBe('/en/leaderboard/score/weekly');
    });

    it('treats module=all the same as no module', async () => {
      const result = await invoke('en', 'weekly', 'all');
      expect(result.redirect).toBe('/en/leaderboard/score/weekly');
    });
  });

  describe('?module= absorption into middle-hub path', () => {
    it('redirects coordinate_quiz to /score/[period]/coordinate-quiz', async () => {
      const result = await invoke('en', 'weekly', 'coordinate_quiz');
      expect(result.redirect).toBe('/en/leaderboard/score/weekly/coordinate-quiz');
    });

    it('redirects legal_moves with monthly period', async () => {
      const result = await invoke('en', 'monthly', 'legal_moves');
      expect(result.redirect).toBe('/en/leaderboard/score/monthly/legal-moves');
    });

    it('redirects route_planner with all-time period', async () => {
      const result = await invoke('en', 'all-time', 'route_planner');
      expect(result.redirect).toBe('/en/leaderboard/score/all-time/route-planner');
    });

    it('extracts first element when module is an array', async () => {
      const result = await invoke('en', 'weekly', ['legal_moves', 'square_colors']);
      expect(result.redirect).toBe('/en/leaderboard/score/weekly/legal-moves');
    });
  });

  describe('locale variants', () => {
    it.each(['en', 'ja', 'es'] as const)(
      'preserves locale=%s in redirect target',
      async (locale) => {
        const result = await invoke(locale, 'weekly');
        expect(result.redirect).toBe(`/${locale}/leaderboard/score/weekly`);
      }
    );

    it.each(['en', 'ja', 'es'] as const)(
      'preserves locale=%s in module-absorbed redirect',
      async (locale) => {
        const result = await invoke(locale, 'monthly', 'diagonal_quiz');
        expect(result.redirect).toBe(`/${locale}/leaderboard/score/monthly/diagonal-quiz`);
      }
    );
  });
});
