/**
 * Coverage for the shared per-move aid-usage block — peek/undo/hint counts and,
 * notably, the exact SAN texts of illegal-move attempts rejected at this move
 * (`MoveOperationLog.invalidAttempts`). Rendered verbatim by both the published
 * game's per-move panel and the local result screen, so a rejected board move
 * looks identical in both.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { MoveOpsDetail } from './MoveOpsDetail';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

afterEach(() => cleanup());

const log = (overrides: Partial<MoveOperationLog> = {}): MoveOperationLog => ({
  inputMethod: 'text',
  peekCount: 0,
  undoCount: 0,
  movePeekCount: 0,
  ...overrides,
});

describe('MoveOpsDetail', () => {
  it('renders nothing when there is no log for the move', () => {
    const { container } = render(<MoveOpsDetail moveOperationLog={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the log has no non-zero counter', () => {
    const { container } = render(<MoveOpsDetail moveOperationLog={log()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows each rejected SAN as its own chip for an illegal-move attempt', () => {
    render(
      <MoveOpsDetail moveOperationLog={log({ invalidCount: 2, invalidAttempts: ['e5', 'Bxb5'] })} />
    );

    expect(screen.getByText('operationLog.columnInvalid')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // One chip per attempt (no longer a single comma-joined run).
    expect(screen.getByText('e5')).toBeInTheDocument();
    expect(screen.getByText('Bxb5')).toBeInTheDocument();
    expect(screen.queryByText('e5, Bxb5')).not.toBeInTheDocument();
  });

  it('renders a heading only when a title is given', () => {
    const { rerender } = render(
      <MoveOpsDetail moveOperationLog={log({ invalidCount: 1, invalidAttempts: ['e5'] })} />
    );
    // No title → the ops block stands alone, no move heading.
    expect(screen.queryByText('12. e5')).not.toBeInTheDocument();

    rerender(
      <MoveOpsDetail
        title="12. e5"
        moveOperationLog={log({ invalidCount: 1, invalidAttempts: ['e5'] })}
      />
    );
    expect(screen.getByText('12. e5')).toBeInTheDocument();
  });
});
