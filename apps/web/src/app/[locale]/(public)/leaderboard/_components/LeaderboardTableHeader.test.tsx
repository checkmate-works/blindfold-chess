import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LeaderboardTableHeader } from './LeaderboardTableHeader';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

function renderInTable() {
  return render(
    <table>
      <LeaderboardTableHeader />
    </table>
  );
}

describe('LeaderboardTableHeader', () => {
  it('should render a thead element', () => {
    const { container } = renderInTable();

    const thead = container.querySelector('thead');
    expect(thead).toBeInTheDocument();
  });

  it('should render three column headers', () => {
    renderInTable();

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(3);
  });

  it('should render rank, player, and score headers', () => {
    renderInTable();

    expect(screen.getByText('leaderboard.table.rank')).toBeInTheDocument();
    expect(screen.getByText('leaderboard.table.player')).toBeInTheDocument();
    expect(screen.getByText('leaderboard.table.score')).toBeInTheDocument();
  });
});
