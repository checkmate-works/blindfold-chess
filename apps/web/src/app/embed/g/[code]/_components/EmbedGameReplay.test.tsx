/**
 * The widget's blindfold behaviour — the part that makes an embedded game from
 * this site worth more than a link to any chess server, and the part a viewer
 * of someone else's article can never report as broken to us.
 *
 * A "ghost" is a piece the player could not see, drawn faint (`opacity-40` on
 * the piece wrapper — see `ChessBoard`'s `hiddenPieceStyle`). Counting them is
 * how these tests ask "what could the player see here?", because the board
 * renders the same SVG either way and only the opacity distinguishes them.
 *
 * Translations resolve through the mocked fallbacks (which echo the key), so
 * the controls are found by their stable key names.
 */
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GamePlaySettings } from '@/lib/games/saved-game-types';

import { EmbedGameReplay } from './EmbedGameReplay';

vi.mock('@/i18n/use-safe-translations');

// The stepper (`MoveNavigationControls`) reads plain next-intl, which needs a
// provider this test has no reason to mount.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const MOVES = ['e4', 'e5', 'Nf3', 'Nc6'] as AlgebraicNotation[];
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_FOUR = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3';

/** A game played on a fully hidden board. */
const BLINDFOLD: GamePlaySettings = {
  boardVisibility: 'never',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

function renderReplay(props: Partial<Parameters<typeof EmbedGameReplay>[0]> = {}) {
  return render(
    <EmbedGameReplay
      moves={MOVES}
      startingFen={START}
      finalFen={AFTER_FOUR}
      playerSide="white"
      flipped={false}
      initialIndex={-1}
      boardTheme="lichess"
      playSettings={BLINDFOLD}
      playSettingsLog={null}
      reproduceByDefault
      canReproduce
      terminationMark={null}
      terminationMarkLabel=""
      attribution={{
        title: 'Blindfold win',
        author: 'ana',
        href: 'https://example.test/en/games/shared/abc?utm_source=embed',
        siteName: 'Shingan Chess',
      }}
      {...props}
    />
  );
}

const ghosts = (container: HTMLElement) => container.querySelectorAll('.opacity-40').length;

describe('EmbedGameReplay', () => {
  it('opens showing the position as the player saw it — every piece a ghost', () => {
    const { container } = renderReplay();
    expect(ghosts(container)).toBe(32);
  });

  it('reveals the board on request, and goes back', () => {
    const { container } = renderReplay();
    const toggle = screen.getByRole('button', { name: 'revealBoard' });

    fireEvent.click(toggle);
    expect(ghosts(container)).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'showAsPlayed' }));
    expect(ghosts(container)).toBe(32);
  });

  it('offers no reveal toggle for a game that hid nothing', () => {
    renderReplay({ playSettings: null, reproduceByDefault: false, canReproduce: false });
    expect(screen.queryByRole('button', { name: /revealBoard|showAsPlayed/ })).toBeNull();
  });

  it('follows a mid-game settings change as the reader steps through', () => {
    // The player uncovered the board after the second half-move, so the same
    // game is blindfold at the start and sighted at the end. Reading only the
    // start-of-game snapshot would draw ghosts on every position.
    const { container } = renderReplay({
      initialIndex: -1,
      playSettingsLog: [{ atMoveIndex: 2, key: 'boardVisibility', to: 'always' }],
    });
    expect(ghosts(container)).toBe(32);

    fireEvent.click(screen.getByLabelText('nextMove'));
    expect(ghosts(container)).toBe(32);

    fireEvent.click(screen.getByLabelText('nextMove'));
    expect(ghosts(container)).toBe(0);
  });

  it('links back to the game it is showing', () => {
    renderReplay();
    const link = screen.getByRole('link', { name: /Blindfold win/ });
    expect(link).toHaveAttribute(
      'href',
      'https://example.test/en/games/shared/abc?utm_source=embed'
    );
    // A frame navigating itself would leave a dead box in the host article.
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('opens at the requested position rather than always at move one', () => {
    renderReplay({ initialIndex: 1 });
    expect(screen.getByLabelText('previousMove')).not.toBeDisabled();
    expect(screen.getByLabelText('nextMove')).not.toBeDisabled();
  });
});
