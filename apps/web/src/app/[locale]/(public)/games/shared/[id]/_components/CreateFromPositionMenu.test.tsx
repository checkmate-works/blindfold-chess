import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import { CreateFromPositionMenu } from './CreateFromPositionMenu';

// Echo translation keys so menu items are addressable by key.
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

// A real mid-game FEN — has spaces and slashes that must be URL-encoded.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 2';

function open(continuationSan?: string) {
  render(
    <CreateFromPositionMenu
      locale={'en' as Locale}
      currentFen={FEN}
      continuationSan={continuationSan}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /menuLabel/ }));
}

describe('CreateFromPositionMenu', () => {
  it('is collapsed until the trigger is clicked', () => {
    render(<CreateFromPositionMenu locale={'en' as Locale} currentFen={FEN} />);
    expect(screen.queryByRole('menuitem')).toBeNull();
  });

  it('lists chunk, position-memory and puzzle (in that order), all seeded with the encoded FEN', () => {
    open('e4');
    const items = screen.getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['chunk', 'positionMemory', 'puzzle']);

    const enc = encodeURIComponent(FEN);
    expect(screen.getByRole('menuitem', { name: 'chunk' })).toHaveAttribute(
      'href',
      `/en/chunks/new?fen=${enc}`
    );
    expect(screen.getByRole('menuitem', { name: 'positionMemory' })).toHaveAttribute(
      'href',
      `/en/practice/position-memory/new?fen=${enc}`
    );
    // Encoded query never leaks raw spaces.
    items.forEach((i) => expect(i.getAttribute('href')).not.toContain(' '));
  });

  it('appends the continuation as the puzzle ?solution= when present', () => {
    open('e4');
    expect(screen.getByRole('menuitem', { name: 'puzzle' })).toHaveAttribute(
      'href',
      `/en/practice/puzzle/new?fen=${encodeURIComponent(FEN)}&solution=e4`
    );
  });

  it('omits ?solution= at the final position (no continuation)', () => {
    open(undefined);
    expect(screen.getByRole('menuitem', { name: 'puzzle' })).toHaveAttribute(
      'href',
      `/en/practice/puzzle/new?fen=${encodeURIComponent(FEN)}`
    );
  });
});
