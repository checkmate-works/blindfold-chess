import * as matchers from '@testing-library/jest-dom/matchers';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpendOptionsSection } from './SpendOptionsSection';

expect.extend(matchers);

vi.mock('@/i18n/routing');

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock('next/image', () => ({
  default: () => null,
}));

// Server component: await the element, then hand it to render.
async function renderSection(hasSubscription: boolean) {
  return render(await SpendOptionsSection({ locale: 'ja', hasSubscription }));
}

describe('SpendOptionsSection', () => {
  it('links each spend to the venue where it is paid', async () => {
    await renderSection(false);

    expect(screen.getByText('spendOptions.maia.cta').closest('a')).toHaveAttribute(
      'href',
      '/games/new'
    );
    expect(screen.getByText('spendOptions.aiReview.cta').closest('a')).toHaveAttribute(
      'href',
      '/games'
    );
    expect(screen.getByText('spendOptions.aiReview.note')).toBeInTheDocument();
  });

  it('tells a subscriber their reviews are already covered', async () => {
    await renderSection(true);

    expect(screen.getByText('spendOptions.aiReview.noteSubscriber')).toBeInTheDocument();
    expect(screen.queryByText('spendOptions.aiReview.note')).not.toBeInTheDocument();
    // Maia has no exemption for anyone — the note must not change.
    expect(screen.getByText('spendOptions.maia.note')).toBeInTheDocument();
  });
});
