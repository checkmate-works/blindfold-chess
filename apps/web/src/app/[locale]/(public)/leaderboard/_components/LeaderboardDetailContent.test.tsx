import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import jaMessages from '@/messages/ja.json';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LeaderboardDetailContent } from './LeaderboardDetailContent';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('./LeaderboardTable', () => ({
  LeaderboardTable: () => <table data-testid="leaderboard-table" />,
}));

// The `_components` barrel transitively reaches `@/i18n/routing` →
// `next-intl/navigation` → `next/navigation`, which is unresolvable under
// vitest (see assertSupportedLocale's TSDoc). Mock the barrel but keep the
// REAL PaginationNavView — its label rendering is what this test is about.
vi.mock('@/app/[locale]/_components', async () => {
  const { PaginationNavView } = await vi.importActual<
    typeof import('@/app/[locale]/_components/PaginationNavView')
  >('@/app/[locale]/_components/PaginationNavView');
  return {
    PaginationNavView,
    SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  };
});

/**
 * Renders through the REAL client i18n path (NextIntlClientProvider + the
 * real ja message file), which is exactly what production does for this
 * Client Component — unlike the Server Component callers, where a
 * provider-wrapped test would be a false green (see issue #93). This guards
 * the `Common.pagination` key wiring against typos and missing messages.
 */
function renderWithJaIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="ja" messages={jaMessages}>
      <IntlAvailableContext.Provider value={true}>{ui}</IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
}

describe('LeaderboardDetailContent pagination labels', () => {
  it('renders localised pagination labels from Common.pagination', () => {
    renderWithJaIntl(
      <LeaderboardDetailContent
        locale="ja"
        period="all-time"
        module="diagonal_quiz"
        settingKey="default"
        moduleSlug="diagonal-quiz"
        currentUserId={null}
        // 3 pages (PAGE_SIZE = 20) so the pagination nav actually renders.
        data={{ rows: [], totalCount: 60, currentUserRank: null }}
        currentPage={2}
      />
    );

    expect(screen.getByRole('navigation', { name: 'ページ送り' })).toBeInTheDocument();
    const previous = screen.getByLabelText('前のページ');
    const next = screen.getByLabelText('次のページ');
    expect(previous).toHaveTextContent('前へ');
    expect(previous).toHaveAttribute(
      'href',
      '/ja/leaderboard/score/all-time/diagonal-quiz/default'
    );
    expect(next).toHaveTextContent('次へ');
    expect(next).toHaveAttribute(
      'href',
      '/ja/leaderboard/score/all-time/diagonal-quiz/default?page=3'
    );
  });
});
