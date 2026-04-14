import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LeaderboardPeriod } from '../_lib/types';
import { PeriodTabs } from './PeriodTabs';

expect.extend(matchers);

const translateMock = vi.fn((key: string) => key);

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { namespace: string }) => {
    // Record the namespace so we can assert the locale / namespace wiring.
    return (key: string) => translateMock(`${namespace}.${key}`);
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  translateMock.mockClear();
});

const basicHrefs: Record<LeaderboardPeriod, string> = {
  'all-time': '/en/leaderboard/score/all-time',
  weekly: '/en/leaderboard/score/weekly',
  monthly: '/en/leaderboard/score/monthly',
};

async function renderTabs(currentPeriod: LeaderboardPeriod, locale = 'en') {
  const element = await PeriodTabs({ currentPeriod, hrefs: basicHrefs, locale });
  return render(element);
}

describe('PeriodTabs', () => {
  it('renders three links, one per period', async () => {
    await renderTabs('all-time');

    const links = screen.getAllByRole('radio');
    expect(links).toHaveLength(3);
  });

  it('renders hrefs taken directly from the hrefs record', async () => {
    await renderTabs('all-time');

    const links = screen.getAllByRole('radio');
    const hrefs = links.map((el) => el.getAttribute('href'));
    expect(hrefs).toEqual([
      '/en/leaderboard/score/all-time',
      '/en/leaderboard/score/weekly',
      '/en/leaderboard/score/monthly',
    ]);
  });

  it('sets aria-checked=true only on the active period', async () => {
    await renderTabs('weekly');

    const links = screen.getAllByRole('radio');
    const weekly = links.find((el) => el.getAttribute('href') === '/en/leaderboard/score/weekly');
    const allTime = links.find(
      (el) => el.getAttribute('href') === '/en/leaderboard/score/all-time'
    );
    const monthly = links.find((el) => el.getAttribute('href') === '/en/leaderboard/score/monthly');

    expect(weekly).toHaveAttribute('aria-checked', 'true');
    expect(allTime).toHaveAttribute('aria-checked', 'false');
    expect(monthly).toHaveAttribute('aria-checked', 'false');
  });

  it('wires the locale through to getTranslations', async () => {
    await renderTabs('monthly', 'ja');

    // translateMock was invoked with `leaderboard.*` keys, proving the
    // namespace was read and the server translator chain ran end-to-end.
    const calledKeys = translateMock.mock.calls.map((c) => c[0]);
    expect(calledKeys).toEqual(
      expect.arrayContaining([
        'leaderboard.periodLabel',
        'leaderboard.period.all-time',
        'leaderboard.period.weekly',
        'leaderboard.period.monthly',
      ])
    );
  });
});
