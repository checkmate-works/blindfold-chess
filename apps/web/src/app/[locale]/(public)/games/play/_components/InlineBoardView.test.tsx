/**
 * Tests for `InlineBoardView`'s own visibility state machine — the two mutually
 * exclusive shapes of its `visibility` prop:
 *
 *   1. `{ kind: 'accordion' }` — collapsed on mount behind a "Show board"
 *      header, with `onPeek` firing once per expand (one expand = one peek).
 *
 *   2. `{ kind: 'always' }` — no collapse chrome, board permanently mounted,
 *      optionally under a blindfold `mask`. A dismissable mask is the 'peek'
 *      board (tap to reveal); a non-dismissable one is pure blindfold
 *      ('never'), which renders a compact bar instead of a covered board.
 *
 * The `ChessBoard` and navigation/flip controls are stubbed so the tests focus
 * purely on `InlineBoardView`'s own branching without coupling to the rendering
 * of the chess content.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { InlineBoardVisibility } from './InlineBoardView';
import { InlineBoardView } from './InlineBoardView';

// InlineBoardView uses `useSafeTranslations`, which falls through to its
// `IntlAvailableContext`-driven fallback (returns `${namespace}.${key}`) when
// no provider is mounted. Stubbing the wrapper directly is cleaner than
// reproducing the fallback format in every assertion.
vi.mock('@/i18n/use-safe-translations');

vi.mock('@/app/_components', () => ({
  BoardFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  showPieceDestinations: true,
  boardTheme: 'monotone',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
  moveInputMode: 'button',
  enabledMoveInputModes: ['button'],
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  boardVisibility: 'peek',
  aiReplyDuration: 5000,
};

const BASE_PROPS = {
  board: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    playerSide: 'white' as const,
    lastMove: null,
    preferences: PREFS,
  },
  moveList: { movesLength: 0, currentPosition: -1, formattedPgn: [] },
};

const renderView = (visibility: InlineBoardVisibility) =>
  render(<InlineBoardView {...BASE_PROPS} visibility={visibility} />);

afterEach(() => {
  cleanup();
});

describe("InlineBoardView — visibility { kind: 'accordion' }", () => {
  it('starts collapsed: header is rendered but the board content is not', () => {
    renderView({ kind: 'accordion' });

    expect(screen.getByText('showBoard')).toBeInTheDocument();
    expect(screen.queryByTestId('chess-board')).not.toBeInTheDocument();
  });

  it('expands when the header button is clicked', () => {
    renderView({ kind: 'accordion' });

    fireEvent.click(screen.getByText('showBoard'));
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });

  it('fires onPeek exactly once per expand action', () => {
    const onPeek = vi.fn();
    renderView({ kind: 'accordion', onPeek });

    fireEvent.click(screen.getByText('showBoard')); // expand → 1
    expect(onPeek).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('showBoard')); // collapse → no peek
    expect(onPeek).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('showBoard')); // expand again → 2
    expect(onPeek).toHaveBeenCalledTimes(2);
  });

  it('renders no mask affordance — the accordion has no blindfold cover', () => {
    renderView({ kind: 'accordion' });
    fireEvent.click(screen.getByText('showBoard'));

    expect(screen.queryByText('revealBoard')).not.toBeInTheDocument();
    expect(screen.queryByText('boardHidden')).not.toBeInTheDocument();
  });
});

describe("InlineBoardView — visibility { kind: 'always' }", () => {
  it('renders the board immediately without showing the collapse header', () => {
    renderView({ kind: 'always' });

    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    expect(screen.queryByText('showBoard')).not.toBeInTheDocument();
  });

  it('renders a dismissable mask (peek) over the board and reveals on tap', () => {
    const onReveal = vi.fn();
    renderView({ kind: 'always', mask: { active: true, dismissable: true, onReveal } });

    // The board frame is still mounted (layout stable); the mask covers it.
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    fireEvent.click(screen.getByText('revealBoard'));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('collapses to a compact bar (never) — no board, no reveal affordance', () => {
    const onReveal = vi.fn();
    renderView({ kind: 'always', mask: { active: true, dismissable: false, onReveal } });

    // Pure blindfold: the board frame is not rendered at all (no full-size
    // board to scroll past / see through), only the "board hidden" indicator.
    expect(screen.queryByTestId('chess-board')).not.toBeInTheDocument();
    expect(screen.getByText('boardHidden')).toBeInTheDocument();
    expect(screen.queryByText('revealBoard')).not.toBeInTheDocument();
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('renders no mask when the mask is absent', () => {
    renderView({ kind: 'always' });

    expect(screen.queryByText('revealBoard')).not.toBeInTheDocument();
    expect(screen.queryByText('boardHidden')).not.toBeInTheDocument();
  });

  it('renders no mask when the mask is present but inactive', () => {
    renderView({ kind: 'always', mask: { active: false, dismissable: true } });

    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
    expect(screen.queryByText('revealBoard')).not.toBeInTheDocument();
    expect(screen.queryByText('boardHidden')).not.toBeInTheDocument();
  });

  it("preserves the accordion's local open state across a switch to 'always' and back", () => {
    // Structural invariant: the accordion's `isOpen` is independent of the
    // always-open branch, so toggling between the two modes never clobbers it.
    const { rerender } = renderView({ kind: 'accordion' });
    fireEvent.click(screen.getByText('showBoard')); // open
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();

    rerender(<InlineBoardView {...BASE_PROPS} visibility={{ kind: 'always' }} />);
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();

    rerender(<InlineBoardView {...BASE_PROPS} visibility={{ kind: 'accordion' }} />);
    // The header reappears; the local isOpen state is still true, so the
    // board content stays mounted.
    expect(screen.getByText('showBoard')).toBeInTheDocument();
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });
});
