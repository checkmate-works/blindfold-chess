import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import { GameChunkSection } from './GameChunkSection';

// Echo translation keys so assertions can target the raw key as the label.
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

// The picker/card children pull their own deps; stub them so this test stays
// focused on the "create a chunk from this position" link.
vi.mock('./GameChunkPicker', () => ({ GameChunkPicker: () => <div data-testid="picker" /> }));
vi.mock('./GameChunkCard', () => ({ GameChunkCard: () => <div data-testid="card" /> }));

vi.mock('../_actions/game-chunks', () => ({
  addGameChunkAction: vi.fn(),
  deleteGameChunkAction: vi.fn(),
}));

// A real mid-game FEN — contains both spaces and slashes, which must be
// URL-encoded into the query string.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 2';

function renderSection(currentUserId?: string) {
  return render(
    <GameChunkSection
      gameId="game-1"
      currentPly={3}
      currentFen={FEN}
      chunks={[]}
      availableChunks={[]}
      currentUserId={currentUserId}
      isGameOwner={false}
      locale={'en' as Locale}
    />
  );
}

describe('GameChunkSection — create-from-position link', () => {
  it('links a signed-in viewer to /chunks/new seeded with the URL-encoded FEN', () => {
    renderSection('user-1');

    const link = screen.getByRole('link', { name: 'createFromPosition' });
    expect(link).toHaveAttribute('href', `/en/chunks/new?fen=${encodeURIComponent(FEN)}`);
    // The href must carry an encoded FEN, never the raw spaces/slashes.
    expect(link.getAttribute('href')).not.toContain(' ');
  });

  it('hides the create link from guests (shown the sign-in prompt instead)', () => {
    renderSection(undefined);

    expect(screen.queryByRole('link', { name: 'createFromPosition' })).toBeNull();
    expect(screen.getByText('signInToLink')).toBeInTheDocument();
  });
});
