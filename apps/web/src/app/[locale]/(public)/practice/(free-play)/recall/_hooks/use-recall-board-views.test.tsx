import type { ReactElement } from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardRevealToggle } from '@/app/[locale]/(public)/games/play/_components/BoardRevealToggle';
import { BoardSettingsButton } from '@/app/[locale]/(public)/games/play/_components/BoardSettingsButton';
import type { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useRecallBoardViews } from './use-recall-board-views';

// The views are inspected as React elements rather than rendered: what this
// hook decides IS the props it hands InlineBoardView (same technique as
// use-play-board-views.test.tsx).
type BoardProps = React.ComponentProps<typeof InlineBoardView>;

const blindfoldPreferences = {
  boardVisibility: 'never',
  showOwnPieces: false,
  showOpponentPieces: false,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
  showCoordinates: true,
  highlightLastMove: true,
  boardTheme: 'classic',
} as unknown as GamePreferences;

const sightedPreferences = {
  ...blindfoldPreferences,
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
} as GamePreferences;

function setup(preferences: GamePreferences) {
  return renderHook(() =>
    useRecallBoardViews({
      boardFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playerColor: 'white',
      lastMove: null,
      preferences,
      originalMovesLength: 4,
      currentPosition: -1,
      formattedPgn: [],
      navigation: {
        navigateToStart: vi.fn(),
        navigatePrevious: vi.fn(),
        navigateNext: vi.fn(),
        navigateToEnd: vi.fn(),
      },
      boardMaskActive: true,
      maskDismissable: false,
      onReveal: vi.fn(),
      canBoardInput: false,
      onSubmitMove: vi.fn(),
      onOpenSettings: vi.fn(),
      showOpponentChip: false,
      opponentChipActive: false,
      opponentMoveNotation: null,
    })
  );
}

/** The `board` group the hook handed InlineBoardView for this view. */
function boardOf(view: React.ReactNode): BoardProps['board'] {
  return (view as ReactElement<BoardProps>).props.board;
}

/** The `slots` group the hook handed InlineBoardView for this view. */
function slotsOf(view: React.ReactNode): NonNullable<BoardProps['slots']> {
  return (view as ReactElement<BoardProps>).props.slots ?? {};
}

describe('useRecallBoardViews finished board', () => {
  it('replaces the settings gear with the reveal toggle', () => {
    const { result } = setup(blindfoldPreferences);

    const inProgressControl = slotsOf(result.current.inProgressBoardView)
      .topRightControl as ReactElement;
    expect(inProgressControl.type).toBe(BoardSettingsButton);

    const finishedControl = slotsOf(result.current.finishedBoardView)
      .topRightControl as ReactElement;
    expect(finishedControl.type).toBe(BoardRevealToggle);
  });

  it('reveals the final position of a blindfold review by default', () => {
    const { result } = setup(blindfoldPreferences);
    const { preferences, hiddenPieceStyle } = boardOf(result.current.finishedBoardView);

    expect(preferences.showOwnPieces).toBe(true);
    expect(preferences.showOpponentPieces).toBe(true);
    expect(hiddenPieceStyle).toBe('absent');
  });

  it('leaves the in-progress board on the review’s own preferences', () => {
    const { result } = setup(blindfoldPreferences);
    const { preferences } = boardOf(result.current.inProgressBoardView);

    expect(preferences.showOwnPieces).toBe(false);
    expect(preferences.showOpponentPieces).toBe(false);
  });

  it('switches back to the as-played view, ghosting what was hidden', () => {
    const { result } = setup(blindfoldPreferences);
    const toggle = slotsOf(result.current.finishedBoardView).topRightControl as ReactElement<{
      revealed: boolean;
      onToggle: () => void;
    }>;
    expect(toggle.props.revealed).toBe(true);

    act(() => toggle.props.onToggle());

    const { preferences, hiddenPieceStyle } = boardOf(result.current.finishedBoardView);
    expect(preferences.showOwnPieces).toBe(false);
    expect(preferences.showOpponentPieces).toBe(false);
    expect(hiddenPieceStyle).toBe('ghost');
  });

  it('keeps the quick-peek modal inputs in step with the toggle', () => {
    const { result } = setup(blindfoldPreferences);
    expect(result.current.finishedPreferences.showOwnPieces).toBe(true);
    expect(result.current.finishedHiddenPieceStyle).toBe('absent');

    const toggle = slotsOf(result.current.finishedBoardView).topRightControl as ReactElement<{
      revealed: boolean;
      onToggle: () => void;
    }>;
    act(() => toggle.props.onToggle());

    expect(result.current.finishedPreferences.showOwnPieces).toBe(false);
    expect(result.current.finishedHiddenPieceStyle).toBe('ghost');
  });

  it('offers no toggle for a review that never hid anything', () => {
    const { result } = setup(sightedPreferences);
    expect(slotsOf(result.current.finishedBoardView).topRightControl).toBeUndefined();
  });
});
