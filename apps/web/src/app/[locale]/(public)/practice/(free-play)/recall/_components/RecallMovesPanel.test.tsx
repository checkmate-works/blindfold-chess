// @vitest-environment jsdom
/**
 * The Lichess link must be reachable at the live position, not only while
 * browsing history — the live position is where the panel sits for almost
 * the whole review and the whole completion screen. And the game link may
 * carry only the moves entered so far: the panel is shown mid-recall, so a
 * link holding the rest of the game would give the answers away.
 *
 * Translations resolve through the mocked safe-translations fallback (echoes
 * the key), so assertions use the stable keys.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetIncludeMovesForTests } from '@/app/[locale]/(public)/games/play/_lib/lichess-include-moves-store';

import { RecallMovesPanel } from './RecallMovesPanel';

vi.mock('@/i18n/use-safe-translations');
// The navigation controls below the list read next-intl directly.
vi.mock('next-intl');

const LATEST_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const BROWSED_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

function renderPanel(currentPosition: number, displayFen: string | null) {
  return render(
    <RecallMovesPanel
      formattedPgn={[
        { moveNumber: 1, whiteMove: 'e4', whiteMoveIndex: 0, blackMove: 'e5', blackMoveIndex: 1 },
      ]}
      moves={['e4', 'e5']}
      currentPosition={currentPosition}
      originalMovesLength={6}
      currentFen={LATEST_FEN}
      displayFen={displayFen}
      onNavigateToPosition={vi.fn()}
      onNavigateToStart={vi.fn()}
      onNavigatePrevious={vi.fn()}
      onNavigateNext={vi.fn()}
      onNavigateToEnd={vi.fn()}
    />
  );
}

const lichessHref = () =>
  screen.getByRole('link', { name: /analyzeOnLichess/ }).getAttribute('href');
const fenUrl = (fen: string) => `https://lichess.org/analysis/${fen.replaceAll(' ', '_')}`;

beforeEach(() => {
  window.localStorage.clear();
  resetIncludeMovesForTests();
});

describe('RecallMovesPanel — Lichess link', () => {
  it('sends the entered moves, opened at the live position, by default', () => {
    renderPanel(-1, null);

    expect(lichessHref()).toBe('https://lichess.org/analysis/pgn/e4_e5#2');
  });

  it('opens the entered moves at the browsed position while navigating', () => {
    renderPanel(0, BROWSED_FEN);

    expect(lichessHref()).toBe('https://lichess.org/analysis/pgn/e4_e5#1');
  });

  it('sends only the shown position once moves are switched off', () => {
    renderPanel(-1, null);
    fireEvent.click(screen.getByRole('switch', { name: /includeMoves/ }));
    expect(lichessHref()).toBe(fenUrl(LATEST_FEN));
  });
});
