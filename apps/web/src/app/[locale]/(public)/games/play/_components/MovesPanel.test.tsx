// @vitest-environment jsdom
/**
 * The per-move operation-log icon is the one thing `MovesPanel` does that
 * `VerticalMoveList` does not, so it survives the extraction as an
 * `adornment` callback rather than as inline markup. These tests pin the
 * contract that callback has to keep: an icon appears for a player move that
 * accumulated a counter, no icon appears for a clean one or for the
 * opponent's, and tapping it opens that move's breakdown without disturbing
 * the move's own click-to-navigate.
 *
 * Translations resolve through the mocked safe-translations fallback (echoes
 * the key), so assertions use the stable `movesPanel.viewOps` key.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { MovesPanel } from './MovesPanel';

vi.mock('@/i18n/use-safe-translations');
// The navigation controls below the list read next-intl directly.
vi.mock('next-intl');

const MOVES = ['e4', 'e5', 'Nf3', 'Nc6'];

const cleanLog = (): MoveOperationLog => ({
  inputMethod: 'text',
  peekCount: 0,
  undoCount: 0,
  movePeekCount: 0,
  invalidCount: 0,
});

const peekedLog = (): MoveOperationLog => ({ ...cleanLog(), peekCount: 2 });

function renderPanel(logs: MoveOperationLog[]) {
  return render(
    <MovesPanel
      moveList={{
        formattedPgn: [
          { moveNumber: 1, whiteMove: 'e4', whiteMoveIndex: 0, blackMove: 'e5', blackMoveIndex: 1 },
          {
            moveNumber: 2,
            whiteMove: 'Nf3',
            whiteMoveIndex: 2,
            blackMove: 'Nc6',
            blackMoveIndex: 3,
          },
        ],
        currentPosition: -1,
        movesLength: MOVES.length,
        currentFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
        displayFen: null,
      }}
      navigation={{
        onNavigateToPosition: vi.fn(),
        onNavigateToStart: vi.fn(),
        onNavigatePrevious: vi.fn(),
        onNavigateNext: vi.fn(),
        onNavigateToEnd: vi.fn(),
      }}
      actions={{
        gameInProgress: false,
        lichessAnalysisUrl: 'https://lichess.org/analysis',
        onRestartFromPosition: vi.fn(),
        onNewGameFromPosition: vi.fn(),
      }}
      operations={{ logs, playerSide: 'white' }}
    />
  );
}

/** The list is behind the collapsed "Moves" header. */
function expandMoves() {
  fireEvent.click(screen.getByRole('button', { name: /moves$/i }));
}

describe('MovesPanel operation-log adornment', () => {
  it('marks only the player moves that accumulated a counter', () => {
    // logs[0] ↔ 1. e4 (peeked), logs[1] ↔ 2. Nf3 (clean).
    renderPanel([peekedLog(), cleanLog()]);
    expandMoves();

    expect(screen.getAllByLabelText('movesPanel.viewOps')).toHaveLength(1);
  });

  it('renders no icon at all when every move is clean', () => {
    renderPanel([cleanLog(), cleanLog()]);
    expandMoves();

    expect(screen.queryByLabelText('movesPanel.viewOps')).toBeNull();
  });

  it('opens the breakdown for the tapped move and closes it on a second tap', () => {
    renderPanel([peekedLog(), cleanLog()]);
    expandMoves();

    const icon = screen.getByLabelText('movesPanel.viewOps');
    expect(screen.queryByText('operationLog.columnPeek')).toBeNull();

    fireEvent.click(icon);
    expect(screen.getByText('operationLog.columnPeek')).toBeTruthy();

    fireEvent.click(icon);
    expect(screen.queryByText('operationLog.columnPeek')).toBeNull();
  });

  it('navigates when the move itself is clicked, not the icon', () => {
    const onNavigateToPosition = vi.fn();
    render(
      <MovesPanel
        moveList={{
          formattedPgn: [
            {
              moveNumber: 1,
              whiteMove: 'e4',
              whiteMoveIndex: 0,
              blackMove: 'e5',
              blackMoveIndex: 1,
            },
          ],
          currentPosition: -1,
          movesLength: 2,
          currentFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          displayFen: null,
        }}
        navigation={{
          onNavigateToPosition,
          onNavigateToStart: vi.fn(),
          onNavigatePrevious: vi.fn(),
          onNavigateNext: vi.fn(),
          onNavigateToEnd: vi.fn(),
        }}
        actions={{
          gameInProgress: false,
          lichessAnalysisUrl: 'https://lichess.org/analysis',
          onRestartFromPosition: vi.fn(),
          onNewGameFromPosition: vi.fn(),
        }}
        operations={{ logs: [peekedLog()], playerSide: 'white' }}
      />
    );
    expandMoves();

    fireEvent.click(screen.getByRole('button', { name: 'e4' }));
    expect(onNavigateToPosition).toHaveBeenCalledWith(0);
  });
});
