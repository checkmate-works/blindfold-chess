// @vitest-environment jsdom
/**
 * The "Analyze on Lichess" button must be reachable at the live position, not
 * only while browsing history — the live position is where the panel sits for
 * almost the whole review and the whole completion screen. These tests pin
 * that it renders there and opens the right FEN for each position kind.
 *
 * Translations resolve through the mocked safe-translations fallback (echoes
 * the key), so assertions use the stable `analyzeOnLichess` key.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
      currentPosition={currentPosition}
      originalMovesLength={2}
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

const lichessUrl = (fen: string) => `https://lichess.org/analysis/${fen.replaceAll(' ', '_')}`;

function clickAnalyze() {
  fireEvent.click(screen.getByRole('button', { name: /analyzeOnLichess/ }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RecallMovesPanel — Analyze on Lichess', () => {
  it('opens the latest position at the live position', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPanel(-1, null);

    clickAnalyze();

    expect(open).toHaveBeenCalledWith(lichessUrl(LATEST_FEN), '_blank');
  });

  it('opens the browsed position while navigating history', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPanel(0, BROWSED_FEN);

    clickAnalyze();

    expect(open).toHaveBeenCalledWith(lichessUrl(BROWSED_FEN), '_blank');
  });
});
