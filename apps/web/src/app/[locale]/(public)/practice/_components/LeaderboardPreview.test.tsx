import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LeaderboardRow } from '@/app/[locale]/(public)/leaderboard/_lib/types';

import { LeaderboardPreview } from './LeaderboardPreview';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/app/[locale]/_components', () => ({
  SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/app/[locale]/(public)/leaderboard/_components/LeaderboardTableHeader', () => ({
  LeaderboardTableHeader: () => (
    <thead>
      <tr>
        <th>rank</th>
        <th>player</th>
        <th>score</th>
        <th>miss</th>
      </tr>
    </thead>
  ),
}));

vi.mock('@/app/[locale]/(public)/leaderboard/_components/LeaderboardTableRow', () => ({
  LeaderboardTableRow: ({ row }: { row: LeaderboardRow }) => (
    <tr data-testid={`row-${row.userId}`}>
      <td>{row.rank}</td>
      <td>{row.username}</td>
      <td>{row.score}</td>
      <td>{row.incorrectAnswers}</td>
    </tr>
  ),
}));

function createRow(overrides: Partial<LeaderboardRow> & { userId: string }): LeaderboardRow {
  return {
    username: 'user',
    score: 100,
    incorrectAnswers: 0,
    timeTaken: 60,
    displayName: null,
    avatarUrl: null,
    country: null,
    flair: null,
    rank: 1,
    ...overrides,
  };
}

describe('LeaderboardPreview', () => {
  it('should return null when rows is empty', () => {
    const { container } = render(
      <LeaderboardPreview
        rows={[]}
        detailPath="/leaderboard/weekly/coordinate-quiz/white"
        locale="en"
      />
    );

    expect(container.innerHTML).toBe('');
  });

  it('should render a table when rows are provided', () => {
    const rows = [createRow({ userId: 'u1', username: 'alice', rank: 1, score: 200 })];

    render(
      <LeaderboardPreview
        rows={rows}
        detailPath="/leaderboard/weekly/coordinate-quiz/white"
        locale="en"
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should render the correct number of rows', () => {
    const rows = [
      createRow({ userId: 'u1', username: 'alice', rank: 1, score: 300 }),
      createRow({ userId: 'u2', username: 'bob', rank: 2, score: 200 }),
      createRow({ userId: 'u3', username: 'carol', rank: 3, score: 100 }),
    ];

    render(
      <LeaderboardPreview
        rows={rows}
        detailPath="/leaderboard/weekly/coordinate-quiz/white"
        locale="en"
      />
    );

    expect(screen.getByTestId('row-u1')).toBeInTheDocument();
    expect(screen.getByTestId('row-u2')).toBeInTheDocument();
    expect(screen.getByTestId('row-u3')).toBeInTheDocument();
  });

  it('should render a "view more" link with the correct path', () => {
    const rows = [createRow({ userId: 'u1', rank: 1 })];

    render(
      <LeaderboardPreview
        rows={rows}
        detailPath="/leaderboard/weekly/legal-moves/king"
        locale="en"
      />
    );

    const link = screen.getByRole('link', { name: 'viewMore' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/en/leaderboard/weekly/legal-moves/king');
  });

  it('should render the section title with weeklyRanking translation key', () => {
    const rows = [createRow({ userId: 'u1', rank: 1 })];

    render(
      <LeaderboardPreview
        rows={rows}
        detailPath="/leaderboard/weekly/coordinate-quiz/white"
        locale="ja"
      />
    );

    expect(screen.getByText('weeklyRanking')).toBeInTheDocument();
  });

  it('should use the locale in the link href', () => {
    const rows = [createRow({ userId: 'u1', rank: 1 })];

    render(
      <LeaderboardPreview
        rows={rows}
        detailPath="/leaderboard/weekly/square-colors/default"
        locale="ja"
      />
    );

    const link = screen.getByRole('link', { name: 'viewMore' });
    expect(link).toHaveAttribute('href', '/ja/leaderboard/weekly/square-colors/default');
  });
});
