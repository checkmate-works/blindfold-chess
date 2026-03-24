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

  it('should render four column headers', () => {
    renderInTable();

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
  });

  it('should render rank, player, score, and miss headers', () => {
    renderInTable();

    expect(screen.getByText('table.rank')).toBeInTheDocument();
    expect(screen.getByText('table.player')).toBeInTheDocument();
    expect(screen.getByText('table.score')).toBeInTheDocument();
    expect(screen.getByText('table.miss')).toBeInTheDocument();
  });
});
