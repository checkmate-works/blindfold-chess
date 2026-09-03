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
import { notFound } from 'next/navigation';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation');

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock('next-intl');

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

/**
 * Load the page once here, at module scope, instead of inside the first
 * `it`. Every dependency the page reaches is stubbed by the `vi.mock` calls
 * above — the vitest transform hoists those above this statement — so there
 * is no ordering reason to defer the load, and deferring it is actively
 * harmful: pulling this graph (leaderboard queries, breadcrumb, next-intl)
 * costs 1-2s on an idle machine, and inside a test body that second is
 * charged to vitest's 5s `testTimeout`. Under `turbo run test` the web suite
 * shares the CPU with the package suites and the first test crossed the
 * limit; the rest of the file hit the module cache and stayed fast, so the
 * failure looked like one specific assertion being flaky. Module scope has
 * no timeout budget at all.
 */
const { default: Page, generateMetadata } = await import('./page');
// Rendering the returned RSC tree is what makes the Breadcrumb mock run;
// hoisted for the same reason as the page itself.
const { renderToStaticMarkup } = await import('react-dom/server');

beforeEach(() => {
  vi.mocked(notFound).mockClear();
  capturedBreadcrumbItems.length = 0;
});

describe('ScoreLeaderboardDetailPage validation', () => {
  it('calls notFound() for an invalid period like "daily"', async () => {
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
    expect(vi.mocked(notFound)).toHaveBeenCalled();
  });

  it('calls notFound() for an invalid module slug', async () => {
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
    expect(vi.mocked(notFound)).toHaveBeenCalled();
  });

  it('calls notFound() for a key that does not belong to the module', async () => {
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
    expect(vi.mocked(notFound)).toHaveBeenCalled();
  });

  it('generateMetadata returns empty object for invalid period', async () => {
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
