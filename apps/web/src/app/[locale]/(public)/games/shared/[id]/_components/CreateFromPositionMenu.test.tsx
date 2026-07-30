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

const GAME_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

function open(continuationSan?: string, linkTarget?: { gameId: string; ply: number }) {
  render(
    <CreateFromPositionMenu
      locale={'en' as Locale}
      currentFen={FEN}
      continuationSan={continuationSan}
      linkTarget={linkTarget}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /menuLabel/ }));
}

describe('CreateFromPositionMenu', () => {
  // The popup is kept mounted and hidden with a CSS class (see ActionsMenu),
  // which jsdom does not apply — so collapse is asserted on the trigger's
  // `aria-expanded`, the same signal assistive tech reads.
  it('is collapsed until the trigger is clicked', () => {
    render(<CreateFromPositionMenu locale={'en' as Locale} currentFen={FEN} />);
    const trigger = screen.getByRole('button', { name: /menuLabel/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  // The tour step (see GameHelpTour) resolves its target by this attribute; a
  // rename here silently drops the step rather than failing.
  it('exposes the help tour target', () => {
    const { container } = render(
      <CreateFromPositionMenu locale={'en' as Locale} currentFen={FEN} />
    );
    expect(container.querySelector('[data-tour-id="game-create-from-position"]')).not.toBeNull();
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

  // The chunk create flow turns `?game=&ply=` into a `game_chunks` row, so a
  // dropped param silently costs the auto-link rather than erroring.
  it('carries the game and ply on the chunk link when a link target is given', () => {
    open('e4', { gameId: GAME_ID, ply: 16 });
    expect(screen.getByRole('menuitem', { name: 'chunk' })).toHaveAttribute(
      'href',
      `/en/chunks/new?fen=${encodeURIComponent(FEN)}&game=${GAME_ID}&ply=16`
    );
  });

  // `game_chunks` cannot anchor a link off a numbered move, and `positions`
  // carries no game reference at all — so neither gets the pair.
  it('leaves position-memory and puzzle as FEN-only seeds even with a link target', () => {
    open('e4', { gameId: GAME_ID, ply: 16 });
    const enc = encodeURIComponent(FEN);
    expect(screen.getByRole('menuitem', { name: 'positionMemory' })).toHaveAttribute(
      'href',
      `/en/practice/position-memory/new?fen=${enc}`
    );
    expect(screen.getByRole('menuitem', { name: 'puzzle' })).toHaveAttribute(
      'href',
      `/en/practice/puzzle/new?fen=${enc}&solution=e4`
    );
  });

  it('falls back to a plain FEN seed when there is no link target', () => {
    open('e4', undefined);
    expect(screen.getByRole('menuitem', { name: 'chunk' })).toHaveAttribute(
      'href',
      `/en/chunks/new?fen=${encodeURIComponent(FEN)}`
    );
  });

  // ply 0 is a real move (0-based index into games.moves[]); a truthiness
  // check on the ply instead of the target would drop the link there.
  it('carries ply 0 rather than treating it as absent', () => {
    open('e4', { gameId: GAME_ID, ply: 0 });
    expect(screen.getByRole('menuitem', { name: 'chunk' })).toHaveAttribute(
      'href',
      `/en/chunks/new?fen=${encodeURIComponent(FEN)}&game=${GAME_ID}&ply=0`
    );
  });
});
