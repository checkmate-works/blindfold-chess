/**
 * Coverage for the per-move position panel's aid-usage stats block — shows
 * peek/undo/hint counts and, notably, the exact SAN texts of illegal-move
 * attempts rejected at this specific move (`MoveOperationLog.invalidAttempts`),
 * so a reviewer can see what was actually tried at a given position (e.g. via
 * a `#47`-style deep link), not just how many attempts there were.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { ReviewMovePositionPanel } from './ReviewMovePositionPanel';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('./CreateFromPositionMenu', () => ({
  CreateFromPositionMenu: () => <div data-testid="create-from-position" />,
}));
vi.mock('./GameMoveContributions', () => ({
  GameMoveContributions: () => <div data-testid="move-contributions" />,
}));

afterEach(() => cleanup());

const baseProps = {
  title: '4...Nf6',
  locale: 'ja' as const,
  currentFen: 'rnbqkb1r/pppppppp/5n2/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 2 3',
  continuationSan: undefined,
  gameId: 'game-1',
  currentPly: 6,
  comments: [],
  gameChunks: [],
  availableChunks: [],
  currentUser: null,
  isGameOwner: false,
  moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
  startingFen: null,
  playerColor: 'black' as const,
};

const log = (overrides: Partial<MoveOperationLog> = {}): MoveOperationLog => ({
  inputMethod: 'text',
  peekCount: 0,
  undoCount: 0,
  movePeekCount: 0,
  ...overrides,
});

describe('ReviewMovePositionPanel — move ops stats', () => {
  it('renders nothing extra when there is no operation log for this move', () => {
    render(<ReviewMovePositionPanel {...baseProps} moveOperationLog={null} />);

    expect(screen.queryByText('operationLog.columnPeek')).not.toBeInTheDocument();
    expect(screen.queryByText('operationLog.columnInvalid')).not.toBeInTheDocument();
  });

  it('renders nothing when the log has no non-zero counters', () => {
    render(<ReviewMovePositionPanel {...baseProps} moveOperationLog={log()} />);

    expect(screen.queryByText('operationLog.columnPeek')).not.toBeInTheDocument();
  });

  it('shows the rejected SAN texts for an illegal-move attempt at this move', () => {
    render(
      <ReviewMovePositionPanel
        {...baseProps}
        moveOperationLog={log({ invalidCount: 2, invalidAttempts: ['Ne7', 'Bxb5'] })}
      />
    );

    expect(screen.getByText('operationLog.columnInvalid')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Ne7, Bxb5')).toBeInTheDocument();
  });

  it('shows peek/undo/hint counts alongside the invalid row', () => {
    render(
      <ReviewMovePositionPanel
        {...baseProps}
        moveOperationLog={log({ peekCount: 3, undoCount: 1, movePeekCount: 2 })}
      />
    );

    expect(screen.getByText('operationLog.columnPeek')).toBeInTheDocument();
    expect(screen.getByText('operationLog.columnUndo')).toBeInTheDocument();
    expect(screen.getByText('operationLog.columnMovePeek')).toBeInTheDocument();
  });
});
