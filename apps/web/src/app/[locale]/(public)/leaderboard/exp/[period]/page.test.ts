/**
 * Unit tests for the canonical exp leaderboard page
 * (`/leaderboard/exp/[period]`). Covers the period-validation branch.
 * The back-link render-path is covered by the sibling
 * `page.render.test.tsx`.
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

// `@/i18n/routing` transitively pulls in next-intl's navigation helpers
// which fail to resolve under jsdom. Stub to a no-op.
vi.mock('@/i18n/routing', () => ({
  Link: () => null,
  redirect: vi.fn(),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
  getPathname: () => '/',
}));

vi.mock('../_actions/getExpLeaderboard', () => ({
  getExpLeaderboard: vi.fn(async () => ({ rows: [] })),
}));

vi.mock('../_components/ExpLeaderboardTable', () => ({
  ExpLeaderboardTable: () => null,
}));

vi.mock('../../_components/LeaderboardTabs', () => ({
  LeaderboardTabs: () => null,
}));

vi.mock('../../_components/PeriodTabs', () => ({
  PeriodTabs: () => null,
}));

beforeEach(() => {
  mockNotFound.mockClear();
});

describe('ExpLeaderboardPeriodPage period validation', () => {
  it('calls notFound() for an invalid period like "daily"', async () => {
    const { default: ExpLeaderboardPeriodPage } = await import('./page');
    await expect(
      ExpLeaderboardPeriodPage({
        params: Promise.resolve({ locale: 'en', period: 'daily' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it('calls notFound() for an unknown period like "foo"', async () => {
    const { default: ExpLeaderboardPeriodPage } = await import('./page');
    await expect(
      ExpLeaderboardPeriodPage({
        params: Promise.resolve({ locale: 'en', period: 'foo' }),
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
