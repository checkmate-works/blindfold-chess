import * as matchers from '@testing-library/jest-dom/matchers';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpendOptionCards } from './SpendOptionCards';

expect.extend(matchers);

vi.mock('@/i18n/routing');

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock('next/image', () => ({
  default: () => null,
}));

// Server component: await the element, then hand it to render.
async function renderCards(overrides: Partial<Parameters<typeof SpendOptionCards>[0]> = {}) {
  return render(
    await SpendOptionCards({
      locale: 'ja',
      hasSubscription: false,
      username: 'alice',
      ...overrides,
    })
  );
}

describe('SpendOptionCards', () => {
  it('links each spend to the venue where it is paid', async () => {
    await renderCards();

    expect(screen.getByText('spendOptions.aiReview.cta').closest('a')).toHaveAttribute(
      'href',
      '/u/alice/games'
    );
    // Maia lands on the standard form with the engine preselected.
    expect(screen.getByText('spendOptions.maia.cta').closest('a')).toHaveAttribute(
      'href',
      '/games/new/standard?engine=maia'
    );
    expect(screen.getByText('spendOptions.aiReview.note')).toBeInTheDocument();
  });

  it('renders the AI review card before the Maia card', async () => {
    await renderCards();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(['spendOptions.aiReview.title', 'spendOptions.maia.title']);
  });

  it('tells a subscriber their reviews are already covered', async () => {
    await renderCards({ hasSubscription: true });

    expect(screen.getByText('spendOptions.aiReview.noteSubscriber')).toBeInTheDocument();
    expect(screen.queryByText('spendOptions.aiReview.note')).not.toBeInTheDocument();
    // Maia has no exemption for anyone — the note must not change.
    expect(screen.getByText('spendOptions.maia.note')).toBeInTheDocument();
  });

  it('falls back to the local games list without a username', async () => {
    await renderCards({ username: null });

    expect(screen.getByText('spendOptions.aiReview.cta').closest('a')).toHaveAttribute(
      'href',
      '/games'
    );
  });
});
