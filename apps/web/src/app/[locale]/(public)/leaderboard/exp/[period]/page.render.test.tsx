/**
 * Render-path test for the canonical exp leaderboard page
 * (`/leaderboard/exp/[period]`). Ensures that the back link at the bottom
 * points at the literal `/[locale]/leaderboard/score/all-time` target
 * regardless of the current period (product decision: the exp page always
 * sends users back to the canonical Score All-Time leaderboard).
 */
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

// Stub `@/i18n/routing.Link` with a plain anchor so the back link's href
// (with the locale prefix the real Link component adds) is assertable.
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    locale,
    children,
    ...rest
  }: {
    href: string;
    locale?: string;
    children: React.ReactNode;
  }) => {
    const prefix = locale ? `/${locale}` : '';
    return (
      <a href={`${prefix}${href}`} {...rest}>
        {children}
      </a>
    );
  },
  redirect: vi.fn(),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
  getPathname: () => '/',
}));

vi.mock('../_actions/getExpLeaderboard', () => ({
  getExpLeaderboard: vi.fn(async () => ({ rows: [] })),
}));

vi.mock('../_components/ExpLeaderboardTable', () => ({
  ExpLeaderboardTable: () => null,
}));

vi.mock('../../_components/LeaderboardTabs', () => ({
  LeaderboardTabs: () => null,
}));

vi.mock('../../_components/PeriodTabs', () => ({
  PeriodTabs: () => null,
}));

vi.mock('@/app/[locale]/_components/PagePanel', () => ({
  PagePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/app/[locale]/_components/AdSense/AdSenseGuard', () => ({
  AdSenseGuard: () => null,
}));

vi.mock('@/app/[locale]/_components/SectionTitle', () => ({
  SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

describe('ExpLeaderboardPeriodPage back link', () => {
  it('renders a back link with the literal /[locale]/leaderboard/score/all-time href on any period', async () => {
    const { default: ExpLeaderboardPeriodPage } = await import('./page');

    const element = await ExpLeaderboardPeriodPage({
      params: Promise.resolve({ locale: 'en', period: 'weekly' }),
    });
    render(element);

    const backLink = screen.getByRole('link', { name: 'backToList' });
    expect(backLink).toHaveAttribute('href', '/en/leaderboard/score/all-time');
  });

  it('uses /[locale]/leaderboard/score/all-time even when the current period is all-time', async () => {
    const { default: ExpLeaderboardPeriodPage } = await import('./page');

    const element = await ExpLeaderboardPeriodPage({
      params: Promise.resolve({ locale: 'ja', period: 'all-time' }),
    });
    render(element);

    const backLink = screen.getByRole('link', { name: 'backToList' });
    expect(backLink).toHaveAttribute('href', '/ja/leaderboard/score/all-time');
  });
});
