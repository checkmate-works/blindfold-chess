import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PositionFeedData } from '../_lib/types';
import { PositionFeedCard } from './PositionFeedCard';

afterEach(() => {
  cleanup();
});

// Mock the GamePreferences hook so we can control the boardTheme value.
const mockUseGamePreferences = vi.fn();
vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => mockUseGamePreferences(),
}));

// Mock BoardThumbnail so we can inspect the props it receives without
// pulling in the full chess board render tree.
vi.mock('@/lib/positions/ui/BoardThumbnail', () => ({
  BoardThumbnail: ({ fen, boardTheme }: { fen: string; boardTheme?: string }) => (
    <div data-testid="board-thumbnail" data-fen={fen} data-board-theme={boardTheme ?? ''} />
  ),
}));

// Mock translations (mirrors how FeedCard tests avoid the i18n setup).
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

// Mock unrelated child components / actions that would otherwise pull in
// server-only code. These are not the subject of this regression test.
vi.mock('./FeedItemCard', () => ({
  FeedItemCard: ({
    href,
    thumbnail,
    children,
  }: {
    href: string | null;
    thumbnail: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div
      data-testid="feed-item-card"
      {...(href === null ? { 'data-has-link': 'false' } : { 'data-href': href })}
    >
      <div data-testid="feed-item-card-thumbnail">{thumbnail}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('@/app/[locale]/(public)/topics/_components/LikeButton', () => ({
  LikeButton: () => <div data-testid="like-button" />,
}));

vi.mock('@/app/[locale]/_components/UserAvatar', () => ({
  UserAvatar: () => <div data-testid="user-avatar" />,
}));

vi.mock('@/app/[locale]/(public)/practice/(free-play)/position-memory/_actions/toggleLike', () => ({
  toggleLike: vi.fn(),
}));

// --- Helpers ---

function createPositionFeedData(overrides: Partial<PositionFeedData> = {}): PositionFeedData {
  return {
    id: 'position-1',
    type: 'memory',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    createdAt: '2025-01-15T10:00:00.000Z',
    author: {
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      country: null,
      flair: null,
    },
    likeMeta: {
      likeCount: 0,
      likedByMe: false,
    },
    ...overrides,
  };
}

const defaultProps = {
  locale: 'en',
  justNowLabel: 'Just now',
};

// --- Tests ---

describe('PositionFeedCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards the user\u2019s selected boardTheme from useGamePreferences to BoardThumbnail', () => {
    // Regression guard: previously PositionFeedCard rendered BoardThumbnail
    // without threading the user's boardTheme preference, so the chess.com
    // theme (and any other non-default theme) was ignored on the home feed.
    mockUseGamePreferences.mockReturnValue({
      preferences: { boardTheme: 'chesscom' },
    });

    render(<PositionFeedCard data={createPositionFeedData()} {...defaultProps} />);

    const thumbnail = screen.getByTestId('board-thumbnail');
    expect(thumbnail).toHaveAttribute('data-board-theme', 'chesscom');
  });

  it('forwards a different boardTheme value (lichess) unchanged', () => {
    mockUseGamePreferences.mockReturnValue({
      preferences: { boardTheme: 'lichess' },
    });

    render(<PositionFeedCard data={createPositionFeedData()} {...defaultProps} />);

    const thumbnail = screen.getByTestId('board-thumbnail');
    expect(thumbnail).toHaveAttribute('data-board-theme', 'lichess');
  });

  it('routes memory-type positions to the position-memory detail page', () => {
    // Regression guard for the 404 bug: puzzle-type positions were being linked
    // to `/practice/position-memory/{id}`, which filters by `type = 'memory'`
    // and returned 404 for puzzle rows surfaced in the home feed.
    mockUseGamePreferences.mockReturnValue({
      preferences: { boardTheme: 'default' },
    });

    render(
      <PositionFeedCard
        data={createPositionFeedData({ id: 'mem-1', type: 'memory' })}
        {...defaultProps}
      />
    );

    const card = screen.getByTestId('feed-item-card');
    expect(card).toHaveAttribute('data-href', '/practice/position-memory/mem-1');
  });

  it('routes puzzle-type positions to the puzzle detail page', () => {
    mockUseGamePreferences.mockReturnValue({
      preferences: { boardTheme: 'default' },
    });

    render(
      <PositionFeedCard
        data={createPositionFeedData({ id: 'puz-1', type: 'puzzle' })}
        {...defaultProps}
      />
    );

    const card = screen.getByTestId('feed-item-card');
    expect(card).toHaveAttribute('data-href', '/practice/puzzle/puz-1');
  });

  it('renders sequence-type positions without a link (no detail page implemented)', () => {
    // `sequence` has no detail page yet. We still surface the card in the
    // feed so the content is visible, but we must not generate a link that
    // would 404.
    mockUseGamePreferences.mockReturnValue({
      preferences: { boardTheme: 'default' },
    });

    render(
      <PositionFeedCard
        data={createPositionFeedData({ id: 'seq-1', type: 'sequence' })}
        {...defaultProps}
      />
    );

    const card = screen.getByTestId('feed-item-card');
    expect(card).not.toHaveAttribute('data-href');
    expect(card).toHaveAttribute('data-has-link', 'false');
  });
});
