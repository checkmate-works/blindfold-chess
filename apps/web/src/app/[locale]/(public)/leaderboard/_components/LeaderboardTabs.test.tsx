import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LeaderboardPeriod } from '../_lib/types';
import { LeaderboardTabs } from './LeaderboardTabs';

expect.extend(matchers);

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
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
});

describe('LeaderboardTabs', () => {
  it('renders Score and Exp tabs', () => {
    render(<LeaderboardTabs activeTab="score" locale="en" period="all-time" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
  });

  it('marks the active tab with aria-selected=true and the other with false', () => {
    render(<LeaderboardTabs activeTab="score" locale="en" period="all-time" />);
    const tabs = screen.getAllByRole('tab');
    const [scoreTab, expTab] = tabs;
    expect(scoreTab).toHaveAttribute('aria-selected', 'true');
    expect(expTab).toHaveAttribute('aria-selected', 'false');
  });

  it('marks Exp tab active when activeTab=exp', () => {
    render(<LeaderboardTabs activeTab="exp" locale="en" period="weekly" />);
    const tabs = screen.getAllByRole('tab');
    const [scoreTab, expTab] = tabs;
    expect(scoreTab).toHaveAttribute('aria-selected', 'false');
    expect(expTab).toHaveAttribute('aria-selected', 'true');
  });

  const cases: Array<{
    period: LeaderboardPeriod;
    locale: string;
    scoreHref: string;
    expHref: string;
  }> = [
    {
      period: 'all-time',
      locale: 'en',
      scoreHref: '/en/leaderboard/score/all-time',
      expHref: '/en/leaderboard/exp/all-time',
    },
    {
      period: 'weekly',
      locale: 'ja',
      scoreHref: '/ja/leaderboard/score/weekly',
      expHref: '/ja/leaderboard/exp/weekly',
    },
    {
      period: 'monthly',
      locale: 'es',
      scoreHref: '/es/leaderboard/score/monthly',
      expHref: '/es/leaderboard/exp/monthly',
    },
  ];

  it.each(cases)(
    'emits hrefs containing period=$period for locale=$locale',
    ({ period, locale, scoreHref, expHref }) => {
      render(<LeaderboardTabs activeTab="score" locale={locale} period={period} />);
      const tabs = screen.getAllByRole('tab');
      const hrefs = tabs.map((el) => el.getAttribute('href'));
      expect(hrefs).toEqual([scoreHref, expHref]);
    }
  );
});
