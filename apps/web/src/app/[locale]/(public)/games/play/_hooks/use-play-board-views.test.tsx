import type { ReactElement } from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TerminationMark } from '@/lib/games/termination-mark';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { InlineBoardView } from '../_components/InlineBoardView';
import { usePlayBoardViews } from './use-play-board-views';

// The views are inspected as React elements rather than rendered: what this
// hook decides IS the props it hands InlineBoardView.
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

const MATE_MARK: TerminationMark = { square: 'e8', kind: 'checkmate' };

function setup(
  preferences: GamePreferences,
  ending: { terminationMark: TerminationMark | null; terminationMarkLabel: string } = {
    terminationMark: MATE_MARK,
    terminationMarkLabel: 'Checkmate',
  }
) {
  return renderHook(() =>
    usePlayBoardViews({
      ...ending,
      displayFen: null,
      currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playerSide: 'white',
      effectiveFlipped: false,
      preferences,
      lastMove: null,
      movesLength: 4,
      currentPosition: -1,
      formattedPgn: [],
      navigation: {
        navigateToStart: vi.fn(),
        navigatePrevious: vi.fn(),
        navigateNext: vi.fn(),
        navigateToEnd: vi.fn(),
        navigateToPosition: vi.fn(),
      },
      onFlipBoard: vi.fn(),
      boardMasked: true,
      onReveal: vi.fn(),
      isPlayerTurn: false,
      isLoading: false,
      onBoardMove: vi.fn(),
      onIllegalMove: vi.fn(),
      aiReply: { active: false, thinking: false },
      aiMoveNotation: null,
      isAiThinking: false,
      canEditPerGameSettings: true,
      onOpenSettings: vi.fn(),
    })
  );
}

function finishedProps(view: React.ReactNode): BoardProps {
  return (view as ReactElement<BoardProps>).props;
}

describe('usePlayBoardViews finished board', () => {
  it('reveals the final position of a blindfold game', () => {
    const { result } = setup(blindfoldPreferences);
    const { preferences, hiddenPieceStyle } = finishedProps(result.current.finishedBoardView);

    expect(preferences.showOwnPieces).toBe(true);
    expect(preferences.showOpponentPieces).toBe(true);
    expect(hiddenPieceStyle).toBe('absent');
  });

  it('leaves the in-progress board on the game’s own preferences', () => {
    const { result } = setup(blindfoldPreferences);
    const { preferences } = finishedProps(result.current.inProgressBoardView);

    expect(preferences.showOwnPieces).toBe(false);
    expect(preferences.showOpponentPieces).toBe(false);
  });

  it('switches back to the as-played view, ghosting what was hidden', () => {
    const { result } = setup(blindfoldPreferences);
    const toggle = finishedProps(result.current.finishedBoardView).topRightControl as ReactElement<{
      revealed: boolean;
      onToggle: () => void;
    }>;
    expect(toggle.props.revealed).toBe(true);

    act(() => toggle.props.onToggle());

    const { preferences, hiddenPieceStyle } = finishedProps(result.current.finishedBoardView);
    expect(preferences.showOwnPieces).toBe(false);
    expect(preferences.showOpponentPieces).toBe(false);
    expect(hiddenPieceStyle).toBe('ghost');
  });

  it('folds a masked board into both sides hidden when reproducing the view', () => {
    // Played on a peek board with both per-side flags left true: nothing is
    // hidden per-flag, but the player still saw a covered board.
    const { result } = setup({ ...sightedPreferences, boardVisibility: 'peek' });
    const toggle = finishedProps(result.current.finishedBoardView).topRightControl as ReactElement<{
      onToggle: () => void;
    }>;

    act(() => toggle.props.onToggle());

    const { preferences } = finishedProps(result.current.finishedBoardView);
    expect(preferences.showOwnPieces).toBe(false);
    expect(preferences.showOpponentPieces).toBe(false);
  });

  it('offers no toggle for a game that hid nothing', () => {
    const { result } = setup(sightedPreferences);
    expect(finishedProps(result.current.finishedBoardView).topRightControl).toBeUndefined();
  });

  it('hands the termination mark to the finished board only', () => {
    const mark: TerminationMark = { square: 'e1', kind: 'resignation' };
    const { result } = setup(sightedPreferences, {
      terminationMark: mark,
      terminationMarkLabel: 'Resignation',
    });

    const finished = finishedProps(result.current.finishedBoardView);
    expect(finished.terminationMark).toEqual(mark);
    expect(finished.terminationMarkLabel).toBe('Resignation');
    // The in-progress board never carries it — a live game has no loser yet.
    expect(finishedProps(result.current.inProgressBoardView).terminationMark).toBeUndefined();
  });

  it('marks nothing while the game is still in progress', () => {
    const { result } = setup(sightedPreferences, {
      terminationMark: null,
      terminationMarkLabel: '',
    });

    expect(finishedProps(result.current.finishedBoardView).terminationMark).toBeNull();
  });
});
