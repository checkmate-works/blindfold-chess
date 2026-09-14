import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import jaMessages from '@/messages/ja.json';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { LeaderboardRow } from '../_lib/types';
import { LeaderboardTable } from './LeaderboardTable';

vi.mock('@/i18n/routing');

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({ default: () => null }));

const PRIVACY_HREF = '/preferences?tab=privacy';

function createRow(overrides: Partial<LeaderboardRow> = {}): LeaderboardRow {
  return {
    rank: 1,
    userId: 'user-1',
    username: 'alice',
    displayName: null,
    avatarUrl: null,
    country: null,
    flair: null,
    score: 100,
    incorrectAnswers: 0,
    timeTaken: 60,
    ...overrides,
  };
}

/**
 * Renders through the REAL client i18n path, so a footer whose message key is
 * missing from the catalog fails here rather than shipping a raw key.
 */
function renderWithJaIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="ja" messages={jaMessages}>
      <IntlAvailableContext.Provider value={true}>{ui}</IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
}

function privacyLink() {
  return screen.queryAllByRole('link').find((link) => link.getAttribute('href') === PRIVACY_HREF);
}

describe('LeaderboardTable privacy footer', () => {
  const rows = [createRow(), createRow({ rank: 2, userId: 'user-2', username: 'bob' })];

  it('offers the opt-out to a viewer named inside the ranking', () => {
    renderWithJaIntl(
      <LeaderboardTable rows={rows} currentUserId="user-2" currentUserRank={null} locale="ja" />
    );

    expect(privacyLink()).toHaveTextContent(jaMessages.leaderboard.optOutLink);
  });

  it('offers the opt-out below the own-rank row of a viewer ranked on another page', () => {
    renderWithJaIntl(
      <LeaderboardTable
        rows={rows}
        currentUserId="user-9"
        currentUserRank={createRow({ rank: 42, userId: 'user-9', username: 'carol' })}
        locale="ja"
      />
    );

    expect(screen.getByText(jaMessages.leaderboard.yourRank)).toBeInTheDocument();
    expect(privacyLink()).toHaveTextContent(jaMessages.leaderboard.optOutLink);
  });

  it('explains the absent rank instead of re-offering the opt-out to a hidden viewer', () => {
    renderWithJaIntl(
      <LeaderboardTable
        rows={rows}
        currentUserId="user-9"
        currentUserRank={null}
        locale="ja"
        viewerHidden
      />
    );

    expect(privacyLink()).toHaveTextContent(jaMessages.leaderboard.hiddenNotice);
  });

  it('stays silent for a viewer who is not on this leaderboard', () => {
    renderWithJaIntl(
      <LeaderboardTable rows={rows} currentUserId="user-9" currentUserRank={null} locale="ja" />
    );

    expect(privacyLink()).toBeUndefined();
  });

  it('stays silent for a signed-out viewer', () => {
    renderWithJaIntl(
      <LeaderboardTable rows={rows} currentUserId={null} currentUserRank={null} locale="ja" />
    );

    expect(privacyLink()).toBeUndefined();
  });
});
