import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserRankInfo } from '@/app/[locale]/(public)/leaderboard/_lib/types';

// --- Mocks ---

const mockGetOptionalUser = vi.fn();
vi.mock('@/lib/auth', () => ({
  getOptionalUser: () => mockGetOptionalUser(),
}));

const mockGetUserRanks = vi.fn();
vi.mock('@/app/[locale]/(public)/leaderboard/_actions/getUserRanks', () => ({
  getUserRanks: (...args: unknown[]) => mockGetUserRanks(...args),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (values && 'rank' in values) return `${key}:${values.rank}`;
    return key;
  },
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    locale?: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/[locale]/_components', () => ({
  SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  PagePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/app/[locale]/(public)/leaderboard/_components/LeaderboardCard', () => ({
  LeaderboardCard: ({
    locale,
    module,
    settingKey,
    period,
    rank,
  }: {
    locale: string;
    module: string;
    settingKey: string;
    period: string;
    rank: number | null;
  }) => (
    <div
      data-testid="leaderboard-card"
      data-locale={locale}
      data-module={module}
      data-setting-key={settingKey}
      data-period={period}
      data-rank={rank}
    >
      {`${module}:${settingKey}`}
      {rank !== null ? `:rank=${rank}` : ':not-ranked'}
    </div>
  ),
}));

// Import after mocks
const { YourRankings } = await import('./YourRankings');

// --- Helpers ---

function createRank(module: string, key: string, rank: number): UserRankInfo {
  return {
    module: module as UserRankInfo['module'],
    key,
    rank,
  };
}

async function renderYourRankings(locale = 'en') {
  const Component = await YourRankings({ locale });
  return render(Component);
}

// --- Tests ---

describe('YourRankings', () => {
  describe('when user is not logged in', () => {
    beforeEach(() => {
      mockGetOptionalUser.mockResolvedValue(null);
    });

    it('renders the card with 3 representative "Not ranked" entries', async () => {
      await renderYourRankings();

      expect(screen.getByText('title')).toBeInTheDocument();

      const cards = screen.getAllByTestId('leaderboard-card');
      expect(cards).toHaveLength(3);

      expect(screen.getByText('coordinate_quiz:white:not-ranked')).toBeInTheDocument();
      expect(screen.getByText('legal_moves:random:not-ranked')).toBeInTheDocument();
      expect(screen.getByText('square_colors:default:not-ranked')).toBeInTheDocument();
    });

    it('does not call getUserRanks', async () => {
      await renderYourRankings();

      expect(mockGetUserRanks).not.toHaveBeenCalled();
    });

    it('renders "View all leaderboards" link', async () => {
      await renderYourRankings();

      expect(screen.getByText('viewAll')).toBeInTheDocument();
      const viewAllLink = screen.getByText('viewAll').closest('a');
      expect(viewAllLink).toHaveAttribute('href', '/leaderboard/score/weekly');
    });

    it('passes correct props to each representative LeaderboardCard', async () => {
      await renderYourRankings();

      const cards = screen.getAllByTestId('leaderboard-card');

      expect(cards[0]).toHaveAttribute('data-locale', 'en');
      expect(cards[0]).toHaveAttribute('data-module', 'coordinate_quiz');
      expect(cards[0]).toHaveAttribute('data-setting-key', 'white');
      expect(cards[0]).toHaveAttribute('data-period', 'weekly');
      expect(cards[0]).not.toHaveAttribute('data-rank');

      expect(cards[1]).toHaveAttribute('data-module', 'legal_moves');
      expect(cards[1]).toHaveAttribute('data-setting-key', 'random');

      expect(cards[2]).toHaveAttribute('data-module', 'square_colors');
      expect(cards[2]).toHaveAttribute('data-setting-key', 'default');
    });
  });

  describe('when user is logged in with no ranks', () => {
    beforeEach(() => {
      mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
      mockGetUserRanks.mockResolvedValue([]);
    });

    it('renders the card with 3 representative "Not ranked" entries', async () => {
      await renderYourRankings();

      expect(screen.getByText('title')).toBeInTheDocument();

      const cards = screen.getAllByTestId('leaderboard-card');
      expect(cards).toHaveLength(3);

      expect(screen.getByText('coordinate_quiz:white:not-ranked')).toBeInTheDocument();
      expect(screen.getByText('legal_moves:random:not-ranked')).toBeInTheDocument();
      expect(screen.getByText('square_colors:default:not-ranked')).toBeInTheDocument();
    });

    it('renders "View all leaderboards" link', async () => {
      await renderYourRankings();

      expect(screen.getByText('viewAll')).toBeInTheDocument();
    });
  });

  describe('when user has fewer than 3 ranks', () => {
    it('renders all ranks when user has 1 rank', async () => {
      mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
      mockGetUserRanks.mockResolvedValue([createRank('coordinate_quiz', 'white', 5)]);

      await renderYourRankings();

      expect(screen.getByText('title')).toBeInTheDocument();
      const cards = screen.getAllByTestId('leaderboard-card');
      expect(cards).toHaveLength(1);
      expect(screen.getByText('coordinate_quiz:white:rank=5')).toBeInTheDocument();
    });

    it('renders all ranks when user has 2 ranks', async () => {
      mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
      mockGetUserRanks.mockResolvedValue([
        createRank('coordinate_quiz', 'white', 3),
        createRank('legal_moves', 'knight', 10),
      ]);

      await renderYourRankings();

      const cards = screen.getAllByTestId('leaderboard-card');
      expect(cards).toHaveLength(2);
      expect(screen.getByText('coordinate_quiz:white:rank=3')).toBeInTheDocument();
      expect(screen.getByText('legal_moves:knight:rank=10')).toBeInTheDocument();
    });
  });

  describe('when user has 3 or more ranks', () => {
    it('renders only the top 3 ranks sorted by rank number when user has 5 ranks', async () => {
      mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
      mockGetUserRanks.mockResolvedValue([
        createRank('coordinate_quiz', 'white', 10),
        createRank('coordinate_quiz', 'black', 2),
        createRank('legal_moves', 'knight', 50),
        createRank('legal_moves', 'queen', 1),
        createRank('square_colors', 'default', 7),
      ]);

      await renderYourRankings();

      // Top 3 by rank: queen(1), black(2), default(7)
      const cards = screen.getAllByTestId('leaderboard-card');
      expect(cards).toHaveLength(3);

      expect(screen.getByText('legal_moves:queen:rank=1')).toBeInTheDocument();
      expect(screen.getByText('coordinate_quiz:black:rank=2')).toBeInTheDocument();
      expect(screen.getByText('square_colors:default:rank=7')).toBeInTheDocument();

      // The rank 10 and 50 items should not be rendered
      expect(screen.queryByText('coordinate_quiz:white:rank=10')).not.toBeInTheDocument();
      expect(screen.queryByText('legal_moves:knight:rank=50')).not.toBeInTheDocument();
    });

    it('renders exactly 3 ranks when user has exactly 3 ranks', async () => {
      mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
      mockGetUserRanks.mockResolvedValue([
        createRank('coordinate_quiz', 'white', 3),
        createRank('legal_moves', 'knight', 1),
        createRank('square_colors', 'default', 5),
      ]);

      await renderYourRankings();

      const cards = screen.getAllByTestId('leaderboard-card');
      expect(cards).toHaveLength(3);
    });
  });

  describe('rank item display', () => {
    it('passes correct module, settingKey, and rank to LeaderboardCard', async () => {
      mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
      mockGetUserRanks.mockResolvedValue([createRank('coordinate_quiz', 'random', 42)]);

      await renderYourRankings();

      const card = screen.getByTestId('leaderboard-card');
      expect(card).toHaveAttribute('data-module', 'coordinate_quiz');
      expect(card).toHaveAttribute('data-setting-key', 'random');
      expect(card).toHaveAttribute('data-rank', '42');
      expect(card).toHaveAttribute('data-period', 'weekly');
    });
  });

  describe('"View all leaderboards" link', () => {
    it('is present when there are ranks', async () => {
      mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
      mockGetUserRanks.mockResolvedValue([createRank('coordinate_quiz', 'white', 1)]);

      await renderYourRankings();

      expect(screen.getByText('viewAll')).toBeInTheDocument();
    });

    it('points to the correct URL with weekly period', async () => {
      mockGetOptionalUser.mockResolvedValue({ id: 'user-1' });
      mockGetUserRanks.mockResolvedValue([createRank('coordinate_quiz', 'white', 1)]);

      await renderYourRankings();

      const viewAllLink = screen.getByText('viewAll').closest('a');
      expect(viewAllLink).toHaveAttribute('href', '/leaderboard/score/weekly');
    });
  });

  describe('getUserRanks is called correctly', () => {
    it('passes user id and "weekly" period', async () => {
      mockGetOptionalUser.mockResolvedValue({ id: 'user-42' });
      mockGetUserRanks.mockResolvedValue([]);

      await renderYourRankings();

      expect(mockGetUserRanks).toHaveBeenCalledWith('user-42', 'weekly');
    });
  });
});
