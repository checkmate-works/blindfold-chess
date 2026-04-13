import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LeaderboardPeriod } from '../_lib/types';
import { PeriodSelector } from './PeriodSelector';

expect.extend(matchers);

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

afterEach(() => {
  cleanup();
  pushMock.mockReset();
});

const basicHrefs: Record<LeaderboardPeriod, string> = {
  'all-time': '/en/leaderboard/score/all-time',
  weekly: '/en/leaderboard/score/weekly',
  monthly: '/en/leaderboard/score/monthly',
};

describe('PeriodSelector', () => {
  it('renders a labeled select with three options in canonical order', () => {
    render(<PeriodSelector currentPeriod="all-time" hrefs={basicHrefs} />);

    const select = screen.getByLabelText('periodLabel') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');

    const options = Array.from(select.querySelectorAll('option'));
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.value)).toEqual(['weekly', 'monthly', 'all-time']);
  });

  it('selects the current period', () => {
    render(<PeriodSelector currentPeriod="monthly" hrefs={basicHrefs} />);

    const select = screen.getByLabelText('periodLabel') as HTMLSelectElement;
    expect(select.value).toBe('monthly');
  });

  it('navigates via router.push(hrefs[value]) on change', () => {
    render(<PeriodSelector currentPeriod="weekly" hrefs={basicHrefs} />);

    const select = screen.getByLabelText('periodLabel') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'all-time' } });

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/en/leaderboard/score/all-time');
  });

  it('uses whatever hrefs shape the caller supplies (exp leaderboard variant)', () => {
    const expHrefs: Record<LeaderboardPeriod, string> = {
      'all-time': '/en/leaderboard/exp/all-time',
      weekly: '/en/leaderboard/exp/weekly',
      monthly: '/en/leaderboard/exp/monthly',
    };
    render(<PeriodSelector currentPeriod="all-time" hrefs={expHrefs} />);

    const select = screen.getByLabelText('periodLabel') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'monthly' } });

    expect(pushMock).toHaveBeenCalledWith('/en/leaderboard/exp/monthly');
  });

  it('renders each option label from the period translation key', () => {
    render(<PeriodSelector currentPeriod="weekly" hrefs={basicHrefs} />);

    const select = screen.getByLabelText('periodLabel') as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option'));
    expect(options.map((o) => o.textContent)).toEqual([
      'period.weekly',
      'period.monthly',
      'period.all-time',
    ]);
  });
});
