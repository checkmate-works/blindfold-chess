import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import enMessages from '@/messages/en.json';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GrantedRank } from '@/lib/db/data/ranks';

import { stashGrantedRanks } from '../_lib/granted-ranks-stash';
import { SESSION_STORAGE_KEYS } from '../_lib/session-storage-keys';
import { RankAchievementModal } from './RankAchievementModal';

expect.extend(matchers);

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

beforeEach(() => {
  sessionStorage.clear();
});

function renderModal(locale = 'en') {
  const ui: ReactNode = <RankAchievementModal locale={locale} />;
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={enMessages as unknown as Record<string, unknown>}
      timeZone="UTC"
    >
      <IntlAvailableContext.Provider value={true}>{ui}</IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
}

describe('RankAchievementModal', () => {
  it('renders nothing when nothing was stashed', () => {
    const { container } = renderModal();
    expect(container).toBeEmptyDOMElement();
  });

  it('headlines the single granted rank when only one was granted', () => {
    const granted: GrantedRank[] = [{ slug: '5kyu', level: 10, color: 'orange' }];
    stashGrantedRanks(granted);

    renderModal();

    expect(screen.getByText('Rank Achieved!')).toBeInTheDocument();
    expect(screen.getByText('5th Kyū')).toBeInTheDocument();
  });

  it('headlines the highest-level rank, not the first array element, when several are granted', () => {
    // checkAndGrantRanks pushes in level-ascending order — a game published
    // before 1dan existed can satisfy 2kyu, 1kyu, and 1dan's bars all at
    // once, so the array arrives as [2kyu, 1kyu, 1dan]. The modal must not
    // just take grantedRanks[0] (that would headline 2kyu).
    const granted: GrantedRank[] = [
      { slug: '2kyu', level: 40, color: 'green' },
      { slug: '1kyu', level: 50, color: 'brown' },
      { slug: '1dan', level: 110, color: 'black' },
    ];
    stashGrantedRanks(granted);

    renderModal();

    expect(screen.getByText('1st Dan')).toBeInTheDocument();
    expect(screen.queryByText('2nd Kyū')).not.toBeInTheDocument();
    expect(screen.queryByText('1st Kyū')).not.toBeInTheDocument();
  });

  it('does not mention lower ranks cleared in the same pass — skip-grants made that routine', () => {
    const granted: GrantedRank[] = [
      { slug: '2kyu', level: 40, color: 'green' },
      { slug: '1kyu', level: 50, color: 'brown' },
      { slug: '1dan', level: 110, color: 'black' },
    ];
    stashGrantedRanks(granted);

    renderModal();

    expect(screen.getByText('1st Dan')).toBeInTheDocument();
    expect(screen.queryByText(/also cleared/i)).not.toBeInTheDocument();
    expect(screen.queryByText('2nd Kyū')).not.toBeInTheDocument();
    expect(screen.queryByText('1st Kyū')).not.toBeInTheDocument();
  });

  it('clears the stash so a reload does not re-show the celebration', () => {
    stashGrantedRanks([{ slug: '5kyu', level: 10, color: 'orange' }]);
    renderModal();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEYS.GRANTED_RANKS)).toBeNull();
  });
});
