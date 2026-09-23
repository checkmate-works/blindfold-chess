import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NativeTileView } from '@/lib/ads/ad';

import { NativeAdTile } from './NativeAdTile';

// The shared identity translator: `t('disclosure')` renders as `disclosure`.
vi.mock('@/i18n/use-safe-translations');

// A board needs a chess renderer, which says nothing about which variant drew
// what. The preferences context is deliberately NOT mocked — see below.
vi.mock('@/lib/ads/ui/CreativeThumbnail', () => ({
  CreativeThumbnail: () => <div data-testid="thumbnail" />,
}));

const creative: NativeTileView = {
  id: 'abc',
  href: 'https://awin1.com/cread.php?awinmid=1&clickref=abc',
  icon: '📘',
  title: 'Mastering the Ruy Lopez',
  description: 'A deep dive into one of the oldest openings in chess.',
  thumbnail: { fen: '8/8/8/8/8/8/8/8 w - - 0 1' },
};

/**
 * Nothing here mounts a `GamePreferencesProvider`, and that is the point.
 *
 * The provider is mounted per section — `/leaderboard` has none — so a
 * variant that draws no board must not ask for one. `useGamePreferences`
 * throws without a provider, so these renders fail outright if the hook ever
 * climbs back up to the top of the component.
 */
describe('NativeAdTile without a GamePreferencesProvider', () => {
  it('renders the iconTile variant, which draws no board', () => {
    render(<NativeAdTile creative={creative} variant="iconTile" />);

    expect(screen.getByRole('link', { name: `disclosure: ${creative.title}` })).toHaveAttribute(
      'href',
      creative.href
    );
    expect(screen.queryByTestId('thumbnail')).not.toBeInTheDocument();
  });

  it('renders the link variant, which draws no board either', () => {
    render(<NativeAdTile creative={creative} variant="link" />);

    expect(screen.getByRole('link', { name: `disclosure: ${creative.title}` })).toBeInTheDocument();
    expect(screen.getByText(creative.description)).toBeInTheDocument();
    expect(screen.queryByTestId('thumbnail')).not.toBeInTheDocument();
  });

  it('renders the row variant as a one-line list item with no board or description', () => {
    render(
      <ul>
        <NativeAdTile creative={creative} variant="row" />
      </ul>
    );

    const row = screen.getByRole('listitem');
    expect(row).toHaveClass('ad-slot-wrapper');
    expect(screen.getByRole('link', { name: `disclosure: ${creative.title}` })).toBeInTheDocument();
    expect(screen.queryByText(creative.description)).not.toBeInTheDocument();
    expect(screen.queryByTestId('thumbnail')).not.toBeInTheDocument();
  });
});

describe('NativeAdTile link attributes', () => {
  it('marks the destination sponsored and opens it off-site', () => {
    render(<NativeAdTile creative={creative} variant="iconTile" />);

    const link = screen.getByRole('link', { name: `disclosure: ${creative.title}` });
    expect(link).toHaveAttribute('rel', 'sponsored noopener noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('never shows a rank on the line the neighbouring tiles use for one', () => {
    // The tile is in no ranking; the description takes that line instead.
    render(<NativeAdTile creative={creative} variant="iconTile" />);

    expect(screen.getByText(creative.description)).toBeInTheDocument();
  });
});
