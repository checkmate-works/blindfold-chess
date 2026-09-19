import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NativeAdView } from '@/lib/ads/ad';

import { NativeAdCard } from './NativeAdCard';

// The shared identity translator: `t('disclosure')` renders as `disclosure`.
vi.mock('@/i18n/use-safe-translations');
vi.mock('@/i18n/routing');

// The thumbnail renders a board, which needs the preferences context and a
// chess renderer — neither says anything about the card's link contract.
vi.mock('@/lib/ads/ui/CreativeThumbnail', () => ({
  CreativeThumbnail: () => <div data-testid="thumbnail" />,
}));

vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({ preferences: { boardTheme: 'default' } }),
}));

const HREF = 'https://awin1.com/cread.php?awinmid=1&clickref=abc';

const creative: NativeAdView = {
  id: 'abc',
  href: HREF,
  avatarImagePath: null,
  avatarAlt: '',
  title: 'Mastering the Ruy Lopez',
  description: 'A deep dive into one of the oldest openings in chess.',
  thumbnail: { fen: '8/8/8/8/8/8/8/8 w - - 0 1' },
};

function renderCard() {
  return render(<NativeAdCard creative={creative} locale="en" />);
}

describe('NativeAdCard', () => {
  it('exposes a focusable anchor to the creative, not a pointer-only card', () => {
    renderCard();

    // ActivityCard's whole-card background link is aria-hidden and out of the
    // tab order, so this is the only anchor keyboard and screen-reader users
    // can reach. The card has no permalink slot to carry it.
    const title = screen.getByRole('link', { name: /Mastering the Ruy Lopez/ });

    expect(title).toHaveAttribute('href', HREF);
    expect(title).not.toHaveAttribute('aria-hidden');
    expect(title).not.toHaveAttribute('tabindex', '-1');
  });

  it('names the reachable anchor as an ad so a link list is not a bare recommendation', () => {
    renderCard();

    expect(
      screen.getByRole('link', { name: 'disclosure: Mastering the Ruy Lopez' })
    ).toBeInTheDocument();
  });

  it('marks every anchor to the affiliate destination as sponsored', () => {
    const { container } = renderCard();

    const anchors = [...container.querySelectorAll('a')].filter(
      (a) => a.getAttribute('href') === HREF
    );

    // Both of them: the reachable title anchor, and the aria-hidden background
    // link. ARIA hides the latter from assistive tech, not from crawlers, so
    // it needs `rel="sponsored"` just as much.
    expect(anchors).toHaveLength(2);
    for (const anchor of anchors) {
      expect(anchor.getAttribute('rel')).toContain('sponsored');
      expect(anchor.getAttribute('rel')).toContain('noopener');
      expect(anchor).toHaveAttribute('target', '_blank');
    }
  });

  it('keeps the disclosure badge a label rather than a second link', () => {
    renderCard();

    const badge = screen.getByText('disclosure');
    expect(badge.tagName).toBe('SPAN');
    expect(badge.closest('a')).toBeNull();
  });
});
