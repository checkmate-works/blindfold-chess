import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChallengeRankUpdateData } from '../_lib/types';
import { ChallengeRankUpdateCard } from './ChallengeRankUpdateCard';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: (namespace: string) => {
    const keys: Record<string, Record<string, string>> = {
      'home.feed.rankUpdate': {
        newEntry: 'Entered the leaderboard!',
        improved: 'Improved rank!',
        rank: 'Rank',
        score: 'Score',
      },
      leaderboard: {
        'module.coordinate_quiz': 'Coordinate Quiz',
        'module.square_colors': 'Square Colors',
        'module.legal_moves': 'Legal Moves',
        'setting.coordinate_quiz.white': 'White',
        'setting.coordinate_quiz.bishop': 'Bishop',
        'setting.square_colors.default': 'Default',
        'setting.legal_moves.random': 'Random',
      },
    };
    return (key: string) => keys[namespace]?.[key] ?? key;
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
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/[locale]/(public)/leaderboard/_lib/types', () => ({
  moduleToSlug: (module: string) => module.replace(/_/g, '-'),
}));

vi.mock('@/app/[locale]/(public)/topics/_components/UserAvatar', () => ({
  UserAvatar: ({ displayName }: { displayName: string }) => (
    <span data-testid="user-avatar">{displayName}</span>
  ),
}));

vi.mock('@/app/[locale]/(public)/topics/_lib/relative-time', () => ({
  formatRelativeTime: () => '2 hours ago',
}));

vi.mock('@blindfold-chess/icons', () => ({
  ChessPieceIcon: ({ type, color, size }: { type: string; color: string; size: number }) => (
    <svg data-testid="chess-piece-icon" data-type={type} data-color={color} data-size={size} />
  ),
}));

vi.mock('react-icons/fa', () => ({
  FaQuestion: ({ className }: { className?: string }) => (
    <span data-testid="fa-question" className={className}>
      ?
    </span>
  ),
}));

function createData(overrides: Partial<ChallengeRankUpdateData> = {}): ChallengeRankUpdateData {
  return {
    menuType: 'coordinate_quiz',
    leaderboardKey: 'white',
    score: 25,
    incorrectAnswers: 3,
    timeTaken: 45,
    rank: 5,
    isNewEntry: true,
    actor: {
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      country: null,
      flair: null,
    },
    ...overrides,
  };
}

const defaultProps = {
  createdAt: '2025-01-15T10:00:00.000Z',
  locale: 'en',
  justNowLabel: 'Just now',
};

describe('ChallengeRankUpdateCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the user avatar with display name', () => {
    render(<ChallengeRankUpdateCard data={createData()} {...defaultProps} />);

    expect(screen.getByTestId('user-avatar')).toHaveTextContent('Test User');
  });

  it('should render "Entered the leaderboard!" for new entries', () => {
    render(<ChallengeRankUpdateCard data={createData({ isNewEntry: true })} {...defaultProps} />);

    expect(screen.getByText('Entered the leaderboard!')).toBeInTheDocument();
  });

  it('should render "Improved rank!" for improvements', () => {
    render(<ChallengeRankUpdateCard data={createData({ isNewEntry: false })} {...defaultProps} />);

    expect(screen.getByText('Improved rank!')).toBeInTheDocument();
  });

  it('should render medal emoji for podium ranks (1-3)', () => {
    render(<ChallengeRankUpdateCard data={createData({ rank: 1 })} {...defaultProps} />);

    // Rank 1 displays gold medal emoji
    expect(screen.getByText('\u{1F947}')).toBeInTheDocument();
  });

  it('should render keycap emoji for non-podium ranks (4-9)', () => {
    render(<ChallengeRankUpdateCard data={createData({ rank: 7 })} {...defaultProps} />);

    // Rank 7 displays keycap emoji (7️⃣)
    expect(screen.getByText('7\uFE0F\u20E3')).toBeInTheDocument();
  });

  it('should render rank emoji for ranked entries', () => {
    render(<ChallengeRankUpdateCard data={createData({ rank: 5 })} {...defaultProps} />);

    // Rank 5 displays keycap emoji (5️⃣)
    expect(screen.getByText('5\uFE0F\u20E3')).toBeInTheDocument();
  });

  it('should link to the correct leaderboard page', () => {
    render(<ChallengeRankUpdateCard data={createData()} {...defaultProps} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/leaderboard/all-time/coordinate-quiz/white');
  });

  it('should render module and setting label with separator', () => {
    render(<ChallengeRankUpdateCard data={createData()} {...defaultProps} />);

    expect(screen.getByText('Coordinate Quiz — White')).toBeInTheDocument();
  });

  it('should render module name only when leaderboardKey is default', () => {
    render(
      <ChallengeRankUpdateCard
        data={createData({ menuType: 'square_colors', leaderboardKey: 'default' })}
        {...defaultProps}
      />
    );

    expect(screen.getByText('Square Colors')).toBeInTheDocument();
    // Should NOT show "— Default" suffix
    expect(screen.queryByText(/Default/)).toBeNull();
  });

  it('should render relative time', () => {
    render(<ChallengeRankUpdateCard data={createData()} {...defaultProps} />);

    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('should use username when displayName is null', () => {
    const data = createData({
      actor: {
        username: 'johndoe',
        displayName: null,
        avatarUrl: null,
        country: null,
        flair: null,
      },
    });

    render(<ChallengeRankUpdateCard data={data} {...defaultProps} />);

    expect(screen.getByTestId('user-avatar')).toHaveTextContent('johndoe');
  });

  describe('thumbnail with getLeaderboardIcon', () => {
    it('should show ChessPieceIcon for piece key (bishop) with lg size', () => {
      render(
        <ChallengeRankUpdateCard
          data={createData({ menuType: 'coordinate_quiz', leaderboardKey: 'bishop' })}
          {...defaultProps}
        />
      );

      const pieceIcon = screen.getByTestId('chess-piece-icon');
      expect(pieceIcon).toBeInTheDocument();
      expect(pieceIcon).toHaveAttribute('data-type', 'b');
      expect(pieceIcon).toHaveAttribute('data-color', 'w');
      expect(pieceIcon).toHaveAttribute('data-size', '48');
    });

    it('should show FaQuestion icon for random key', () => {
      render(
        <ChallengeRankUpdateCard
          data={createData({ menuType: 'legal_moves', leaderboardKey: 'random' })}
          {...defaultProps}
        />
      );

      const questionIcon = screen.getByTestId('fa-question');
      expect(questionIcon).toBeInTheDocument();
      expect(questionIcon).toHaveClass('w-10', 'h-10');
    });

    it('should show emoji for default key', () => {
      render(
        <ChallengeRankUpdateCard
          data={createData({ menuType: 'square_colors', leaderboardKey: 'default' })}
          {...defaultProps}
        />
      );

      // square_colors maps to emoji from PRACTICE_EMOJIS
      expect(screen.getByText('\u{1F3A8}')).toBeInTheDocument();
    });

    it('should always show trophy overlay in all thumbnail variants', () => {
      // Piece key case
      const { unmount: u1 } = render(
        <ChallengeRankUpdateCard
          data={createData({ menuType: 'coordinate_quiz', leaderboardKey: 'bishop' })}
          {...defaultProps}
        />
      );
      expect(screen.getByText('\u{1F3C6}')).toBeInTheDocument();
      u1();

      // Random key case
      const { unmount: u2 } = render(
        <ChallengeRankUpdateCard
          data={createData({ menuType: 'legal_moves', leaderboardKey: 'random' })}
          {...defaultProps}
        />
      );
      expect(screen.getByText('\u{1F3C6}')).toBeInTheDocument();
      u2();

      // Default key case
      render(
        <ChallengeRankUpdateCard
          data={createData({ menuType: 'square_colors', leaderboardKey: 'default' })}
          {...defaultProps}
        />
      );
      expect(screen.getByText('\u{1F3C6}')).toBeInTheDocument();
    });

    it('should render trophy overlay as absolute element inside a relative container', () => {
      const { container } = render(
        <ChallengeRankUpdateCard
          data={createData({ menuType: 'coordinate_quiz', leaderboardKey: 'bishop' })}
          {...defaultProps}
        />
      );

      const relativeContainer = container.querySelector('.relative');
      expect(relativeContainer).not.toBeNull();
      const absoluteOverlay = container.querySelector('.absolute');
      expect(absoluteOverlay).not.toBeNull();
      expect(absoluteOverlay?.textContent).toBe('\u{1F3C6}');
    });
  });
});
