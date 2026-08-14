/**
 * Unit tests for the canonical score leaderboard detail page
 * (`/leaderboard/score/[period]/[module-slug]/[key]`). Covers both the
 * validation branches and the breadcrumb-dedup logic:
 *
 *   - Variant modules (`key !== 'default'`) → 3 breadcrumb items with the
 *     leaf carrying only the variant label (e.g. "White", "Bishop"), never
 *     "Module — Variant".
 *   - Non-variant modules (`key === 'default'`) → 2 breadcrumb items, with
 *     the middle hub item ("Square Colors") as the final step.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
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

vi.mock('@/app/[locale]/(public)/leaderboard/_actions/getLeaderboard', () => ({
  getLeaderboard: vi.fn(async () => ({ rows: [], totalCount: 0, currentUserRank: null })),
}));

vi.mock('@/app/[locale]/(public)/leaderboard/_components', () => ({
  LeaderboardDetailContent: () => null,
}));
vi.mock('@/app/[locale]/(public)/leaderboard/_components/ChallengeLink', () => ({
  ChallengeLink: () => null,
}));
vi.mock('@/app/[locale]/(public)/leaderboard/_components/PeriodTabs', () => ({
  PeriodTabs: () => null,
}));

// Capture whatever `items` prop the page hands to <Breadcrumb>. The real
// component walks the tree to produce JSON-LD; we just want to inspect
// the structure the page authored.
type BreadcrumbItem = { label: string; href?: string };
const capturedBreadcrumbItems: BreadcrumbItem[][] = [];
vi.mock('@/app/[locale]/_components/Breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: BreadcrumbItem[] }) => {
    capturedBreadcrumbItems.push(items);
    return null;
  },
}));

beforeEach(() => {
  mockNotFound.mockClear();
  capturedBreadcrumbItems.length = 0;
});

describe('ScoreLeaderboardDetailPage validation', () => {
  it('calls notFound() for an invalid period like "daily"', async () => {
    const { default: Page } = await import('./page');
    await expect(
      Page({
        params: Promise.resolve({
          locale: 'en',
          period: 'daily',
          'module-slug': 'coordinate-quiz',
          key: 'white',
        }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('calls notFound() for an invalid module slug', async () => {
    const { default: Page } = await import('./page');
    await expect(
      Page({
        params: Promise.resolve({
          locale: 'en',
          period: 'weekly',
          'module-slug': 'unknown-module',
          key: 'white',
        }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('calls notFound() for a key that does not belong to the module', async () => {
    const { default: Page } = await import('./page');
    await expect(
      Page({
        params: Promise.resolve({
          locale: 'en',
          period: 'weekly',
          'module-slug': 'coordinate-quiz',
          key: 'king', // king belongs to legal-moves, not coordinate-quiz
        }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('generateMetadata returns empty object for invalid period', async () => {
    const { generateMetadata } = await import('./page');
    const result = await generateMetadata({
      params: Promise.resolve({
        locale: 'en',
        period: 'daily',
        'module-slug': 'coordinate-quiz',
        key: 'white',
      }),
      searchParams: Promise.resolve({}),
    });
    expect(result).toEqual({});
  });
});

describe('ScoreLeaderboardDetailPage breadcrumb', () => {
  async function renderWith(
    moduleSlug: string,
    key: string,
    period = 'weekly'
  ): Promise<BreadcrumbItem[]> {
    const { default: Page } = await import('./page');
    const element = await Page({
      params: Promise.resolve({
        locale: 'en',
        period,
        'module-slug': moduleSlug,
        key,
      }),
      searchParams: Promise.resolve({}),
    });
    // The page returns an RSC tree; rendering it forces the Breadcrumb mock
    // to run and push the items into `capturedBreadcrumbItems`.
    const { renderToStaticMarkup } = await import('react-dom/server');
    renderToStaticMarkup(element as React.ReactElement);
    const captured = capturedBreadcrumbItems[capturedBreadcrumbItems.length - 1];
    expect(captured).toBeDefined();
    return captured;
  }

  describe('variant modules (key !== "default")', () => {
    it('coordinate_quiz + white → leaf is only the variant ("setting.coordinate_quiz.white")', async () => {
      const items = await renderWith('coordinate-quiz', 'white');
      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({
        label: 'title',
        href: '/leaderboard/score/weekly',
      });
      expect(items[1]).toEqual({
        label: 'moduleFilter.coordinate_quiz',
        href: '/leaderboard/score/weekly/coordinate-quiz',
      });
      expect(items[2]).toEqual({
        label: 'setting.coordinate_quiz.white',
      });
      // Regression guard: the leaf must NOT be the full cardTitle form
      expect(items[2].label).not.toBe('cardTitle.coordinate_quiz.white');
    });

    it('legal_moves + knight → leaf is only the variant', async () => {
      const items = await renderWith('legal-moves', 'knight');
      expect(items).toHaveLength(3);
      expect(items[2]).toEqual({ label: 'setting.legal_moves.knight' });
    });

    it('route_planner + bishop → leaf is only the variant', async () => {
      const items = await renderWith('route-planner', 'bishop');
      expect(items).toHaveLength(3);
      expect(items[2]).toEqual({ label: 'setting.route_planner.bishop' });
    });

    it('variant leaf has no href (it is the current page, not a link)', async () => {
      const items = await renderWith('coordinate-quiz', 'white');
      expect(items[2].href).toBeUndefined();
    });
  });

  describe('non-variant modules (key === "default")', () => {
    it('square_colors + default → breadcrumb has exactly 2 items, ending at the middle hub', async () => {
      const items = await renderWith('square-colors', 'default');
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        label: 'title',
        href: '/leaderboard/score/weekly',
      });
      expect(items[1]).toEqual({
        label: 'moduleFilter.square_colors',
        href: '/leaderboard/score/weekly/square-colors',
      });
    });

    it('diagonal_quiz + default → breadcrumb has exactly 2 items', async () => {
      const items = await renderWith('diagonal-quiz', 'default');
      expect(items).toHaveLength(2);
      expect(items[1]).toEqual({
        label: 'moduleFilter.diagonal_quiz',
        href: '/leaderboard/score/weekly/diagonal-quiz',
      });
    });

    it('board_symmetry + default → breadcrumb has exactly 2 items', async () => {
      const items = await renderWith('board-symmetry', 'default');
      expect(items).toHaveLength(2);
      expect(items[1]).toEqual({
        label: 'moduleFilter.board_symmetry',
        href: '/leaderboard/score/weekly/board-symmetry',
      });
    });
  });

  describe('period passthrough', () => {
    it('uses the current period in all hrefs', async () => {
      const items = await renderWith('coordinate-quiz', 'white', 'all-time');
      expect(items[0].href).toBe('/leaderboard/score/all-time');
      expect(items[1].href).toBe('/leaderboard/score/all-time/coordinate-quiz');
    });
  });
});
