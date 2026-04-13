/**
 * Focused unit test for the period-validation branch of the canonical
 * score leaderboard top page (`/leaderboard/score/[period]`). We do not
 * render the full tree — we only verify that an invalid period triggers
 * notFound() before any DB/UI code runs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  permanentRedirect: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('@/i18n/routing', () => ({
  Link: () => null,
  redirect: vi.fn(),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
  getPathname: () => '/',
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  })),
}));

vi.mock('@/lib/auth', () => ({
  getOptionalUser: vi.fn(async () => null),
}));

// Stub every component the page pulls in so the module loads in jsdom
// without pulling server-only deps transitively.
vi.mock('../../_components/ModuleFilter', () => ({
  ModuleFilter: () => null,
}));
vi.mock('../../_components/LeaderboardTabs', () => ({
  LeaderboardTabs: () => null,
}));
vi.mock('../../_components/LeaderboardTopContent', () => ({
  LeaderboardTopContent: () => null,
}));
vi.mock('../../_components/PeriodTabs', () => ({
  PeriodTabs: () => null,
}));
vi.mock('../../_components/SignUpBanner', () => ({
  SignUpBanner: () => null,
}));

beforeEach(() => {
  mockNotFound.mockClear();
});

describe('ScoreLeaderboardPeriodPage period validation', () => {
  it('calls notFound() for an invalid period like "daily"', async () => {
    const { default: ScoreLeaderboardPeriodPage } = await import('./page');
    await expect(
      ScoreLeaderboardPeriodPage({
        params: Promise.resolve({ locale: 'en', period: 'daily' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it('calls notFound() for an unknown period like "foo"', async () => {
    const { default: ScoreLeaderboardPeriodPage } = await import('./page');
    await expect(
      ScoreLeaderboardPeriodPage({
        params: Promise.resolve({ locale: 'en', period: 'foo' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it('calls notFound() for empty period', async () => {
    const { default: ScoreLeaderboardPeriodPage } = await import('./page');
    await expect(
      ScoreLeaderboardPeriodPage({
        params: Promise.resolve({ locale: 'en', period: '' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it('generateMetadata returns empty object for invalid period', async () => {
    const { generateMetadata } = await import('./page');
    const result = await generateMetadata({
      params: Promise.resolve({ locale: 'en', period: 'daily' }),
    });
    expect(result).toEqual({});
  });
});
