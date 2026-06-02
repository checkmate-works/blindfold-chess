/**
 * Tests for `InlineBoardView` focusing on the two non-trivial behaviors
 * added during the Phase 2 / Phase 3 work:
 *
 *   1. `collapseSignal` — auto-collapse on player move commit, with the
 *      initial-mount run skipped so a freshly opened page doesn't
 *      redundantly close an already-closed accordion.
 *
 *   2. `alwaysOpen` — when true, the collapse chrome is removed, the
 *      board is permanently visible, and `collapseSignal` is ignored.
 *      Used for `boardVisibility === 'always'`.
 *
 * The `ChessBoard` and navigation/flip controls are stubbed so the tests
 * focus purely on `InlineBoardView`'s own state machine without coupling
 * to the rendering of the chess content.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { InlineBoardView } from './InlineBoardView';

// InlineBoardView uses `useSafeTranslations`, which falls through to its
// `IntlAvailableContext`-driven fallback (returns `${namespace}.${key}`) when
// no provider is mounted. Stubbing the wrapper directly is cleaner than
// reproducing the fallback format in every assertion.
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('@/app/_components', () => ({
  ChessBoard: () => <div data-testid="chess-board" />,
  FlipBoardButton: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" data-testid="flip-board" onClick={onClick} />
  ),
}));

vi.mock('./HorizontalMoveList', () => ({
  HorizontalMoveList: () => <div data-testid="horizontal-move-list" />,
}));

vi.mock('./MoveNavigationControls', () => ({
  MoveNavigationControls: () => <div data-testid="move-navigation" />,
}));

const PREFS: GamePreferences = {
  showCoordinates: true,
  highlightLastMove: true,
  boardTheme: 'monotone',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  moveInputMode: 'button',
  enabledMoveInputModes: ['button'],
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  boardVisibility: 'peek',
  peekMode: 'inline',
};

const BASE_PROPS = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  playerSide: 'white' as const,
  lastMove: null,
  preferences: PREFS,
  movesLength: 0,
  currentPosition: -1,
  formattedPgn: [],
};

afterEach(() => {
  cleanup();
});

describe('InlineBoardView — peek (collapsible) mode', () => {
  it('starts collapsed: header is rendered but the board content is not', () => {
    render(<InlineBoardView {...BASE_PROPS} />);

    expect(screen.getByText('showBoard')).toBeInTheDocument();
    expect(screen.queryByTestId('chess-board')).not.toBeInTheDocument();
  });

  it('expands when the header button is clicked', () => {
    render(<InlineBoardView {...BASE_PROPS} />);

    fireEvent.click(screen.getByText('showBoard'));
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });

  it('fires onPeek exactly once per expand action', () => {
    const onPeek = vi.fn();
    render(<InlineBoardView {...BASE_PROPS} onPeek={onPeek} />);

    fireEvent.click(screen.getByText('showBoard')); // expand → 1
    expect(onPeek).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('showBoard')); // collapse → no peek
    expect(onPeek).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('showBoard')); // expand again → 2
    expect(onPeek).toHaveBeenCalledTimes(2);
  });

  it('does NOT auto-collapse on the initial render despite collapseSignal being defined', () => {
    // collapseSignal: 0 on first render must not trigger setIsOpen(false)
    // — initial state already false, but firing the effect could mask a
    // future change-detection bug. Render and verify no inadvertent close.
    render(<InlineBoardView {...BASE_PROPS} collapseSignal={0} />);
    fireEvent.click(screen.getByText('showBoard')); // open
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });

  it('auto-collapses when collapseSignal increments after the board was opened', () => {
    const { rerender } = render(<InlineBoardView {...BASE_PROPS} collapseSignal={0} />);

    fireEvent.click(screen.getByText('showBoard')); // open
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();

    rerender(<InlineBoardView {...BASE_PROPS} collapseSignal={1} />);
    expect(screen.queryByTestId('chess-board')).not.toBeInTheDocument();
  });

  it('re-firing the same collapseSignal value does NOT re-collapse', () => {
    // Idempotent guard: only a CHANGE in collapseSignal triggers auto-collapse.
    const { rerender } = render(<InlineBoardView {...BASE_PROPS} collapseSignal={3} />);

    fireEvent.click(screen.getByText('showBoard')); // open after the initial
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();

    // Same value → no effect run.
    rerender(<InlineBoardView {...BASE_PROPS} collapseSignal={3} />);
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });
});

describe('InlineBoardView — alwaysOpen mode', () => {
  it('renders the board immediately without showing the collapse header', () => {
    render(<InlineBoardView {...BASE_PROPS} alwaysOpen />);

    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    expect(screen.queryByText('showBoard')).not.toBeInTheDocument();
  });

  it('does not fire onPeek (no discrete peek event in always-open mode)', () => {
    const onPeek = vi.fn();
    render(<InlineBoardView {...BASE_PROPS} alwaysOpen onPeek={onPeek} />);

    // No header to click — and even if the parent wired onPeek defensively,
    // it should never be invoked from inside InlineBoardView when alwaysOpen.
    expect(onPeek).not.toHaveBeenCalled();
  });

  it('ignores collapseSignal changes — the board stays visible', () => {
    const { rerender } = render(<InlineBoardView {...BASE_PROPS} alwaysOpen collapseSignal={0} />);
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();

    rerender(<InlineBoardView {...BASE_PROPS} alwaysOpen collapseSignal={5} />);
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();

    rerender(<InlineBoardView {...BASE_PROPS} alwaysOpen collapseSignal={6} />);
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });

  it('renders a dismissable mask (peek) over the board and reveals on tap', () => {
    const onReveal = vi.fn();
    render(
      <InlineBoardView {...BASE_PROPS} alwaysOpen masked maskDismissable onReveal={onReveal} />
    );

    // The board frame is still mounted (layout stable); the mask covers it.
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    fireEvent.click(screen.getByText('revealBoard'));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('renders a non-dismissable mask (never) with no reveal affordance', () => {
    const onReveal = vi.fn();
    render(<InlineBoardView {...BASE_PROPS} alwaysOpen masked onReveal={onReveal} />);

    expect(screen.getByText('boardHidden')).toBeInTheDocument();
    expect(screen.queryByText('revealBoard')).not.toBeInTheDocument();
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('renders no mask when not masked', () => {
    render(<InlineBoardView {...BASE_PROPS} alwaysOpen />);

    expect(screen.queryByText('revealBoard')).not.toBeInTheDocument();
    expect(screen.queryByText('boardHidden')).not.toBeInTheDocument();
  });

  it('preserves the local isOpen state when alwaysOpen flips off (returns to whatever it was)', () => {
    // User opened the board manually under peek mode; switching the same
    // component to alwaysOpen and back should not clobber the "opened" state.
    // (This is a structural invariant — InlineBoardView's local state is not
    // tied to alwaysOpen, only its rendering branch is.)
    const { rerender } = render(<InlineBoardView {...BASE_PROPS} />);
    fireEvent.click(screen.getByText('showBoard')); // open
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();

    rerender(<InlineBoardView {...BASE_PROPS} alwaysOpen />);
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();

    rerender(<InlineBoardView {...BASE_PROPS} />);
    // The header reappears; the local isOpen state is still true, so the
    // board content stays mounted.
    expect(screen.getByText('showBoard')).toBeInTheDocument();
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });
});
