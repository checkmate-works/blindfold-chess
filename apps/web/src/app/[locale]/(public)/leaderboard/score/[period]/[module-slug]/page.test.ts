/**
 * Focused unit test for the validation branches of the score leaderboard
 * middle hub (`/leaderboard/score/[period]/[module-slug]`). Verifies that
 * invalid periods and invalid module slugs both trigger notFound() before
 * any DB/UI code runs.
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

vi.mock('../../../_components/ModuleFilter', () => ({
  ModuleFilter: () => null,
}));
vi.mock('../../../_components/LeaderboardTabs', () => ({
  LeaderboardTabs: () => null,
}));
vi.mock('../../../_components/LeaderboardTopContent', () => ({
  LeaderboardTopContent: () => null,
}));
vi.mock('../../../_components/PeriodTabs', () => ({
  PeriodTabs: () => null,
}));
vi.mock('../../../_components/SignUpBanner', () => ({
  SignUpBanner: () => null,
}));

beforeEach(() => {
  mockNotFound.mockClear();
});

describe('ScoreLeaderboardModuleHubPage validation', () => {
  it('calls notFound() for an invalid period', async () => {
    const { default: Page } = await import('./page');
    await expect(
      Page({
        params: Promise.resolve({
          locale: 'en',
          period: 'daily',
          'module-slug': 'coordinate-quiz',
        }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('calls notFound() for an unknown module slug', async () => {
    const { default: Page } = await import('./page');
    await expect(
      Page({
        params: Promise.resolve({
          locale: 'en',
          period: 'weekly',
          'module-slug': 'unknown-module',
        }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('calls notFound() for an underscore-form module (rejects legacy shape)', async () => {
    const { default: Page } = await import('./page');
    await expect(
      Page({
        params: Promise.resolve({
          locale: 'en',
          period: 'weekly',
          'module-slug': 'coordinate_quiz',
        }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('generateMetadata returns empty object for invalid module slug', async () => {
    const { generateMetadata } = await import('./page');
    const result = await generateMetadata({
      params: Promise.resolve({
        locale: 'en',
        period: 'weekly',
        'module-slug': 'unknown-module',
      }),
    });
    expect(result).toEqual({});
  });
});
