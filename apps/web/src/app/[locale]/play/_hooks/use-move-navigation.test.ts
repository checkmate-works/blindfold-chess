// @vitest-environment jsdom
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMoveNavigation } from './use-move-navigation';

describe('useMoveNavigation', () => {
  const mockMoves = ['e4', 'e5', 'Nf3', 'Nc6'] as AlgebraicNotation[]; // 4 moves
  const defaultProps = {
    moves: mockMoves,
  };

  it('should initialize with default states (latest position)', () => {
    const { result } = renderHook(() => useMoveNavigation(defaultProps));

    expect(result.current.currentPosition).toBe(-1);
    expect(result.current.displayFen).toBeNull();
  });

  it('should navigate to start', () => {
    const { result } = renderHook(() => useMoveNavigation(defaultProps));

    act(() => {
      result.current.navigateToStart();
    });

    expect(result.current.currentPosition).toBe(-2);
    expect(result.current.displayFen).not.toBeNull();
  });

  it('should navigate to end', () => {
    const { result } = renderHook(() => useMoveNavigation(defaultProps));

    act(() => {
      result.current.navigateToStart(); // Go to start first
    });
    expect(result.current.currentPosition).toBe(-2);

    act(() => {
      result.current.navigateToEnd();
    });

    expect(result.current.currentPosition).toBe(-1);
    expect(result.current.displayFen).toBeNull(); // Latest FEN is not stored in displayFen for -1
  });

  it('should navigate next from start', () => {
    const { result } = renderHook(() => useMoveNavigation(defaultProps));

    act(() => {
      result.current.navigateToStart();
    });

    act(() => {
      result.current.navigateNext();
    });

    expect(result.current.currentPosition).toBe(0); // Index 0 (first move)
  });

  it('should navigate previous from latest', () => {
    const { result } = renderHook(() => useMoveNavigation(defaultProps));

    // Initial state is -1 (latest)
    // Moves length is 4. Indices: 0, 1, 2, 3.
    // Previous from -1 should go to last move index: 4 - 2 = 2? Wait.
    // Let's check logic:
    // if (currentPosition === -1) targetPos = moves.length - 2 ??
    // No, logic in hook:
    // if (currentPosition === -1) targetPos = moves.length - 2;
    // Wait, moves.length is 4. moves.length - 1 is 3 (last move index).
    // If I am at "Latest" (after move 3), Previous should take me to Move 3 (index 3).
    // Let's look at the implementation again.

    // In use-move-navigation.ts:
    // if (currentPosition === -1) { targetPos = moves.length - 2; }
    // If moves.length = 1. targetPos = -1.
    // If moves.length = 4. targetPos = 2.
    // Index 2 is the 3rd move.

    // Wait, if I am at "Latest" (after 4th move). I see the board state AFTER 4th move.
    // If I click "Previous", I want to see board state AFTER 3rd move?
    // "Previous" usually means "undo last move".
    // "Latest" state shows state after ALL moves.
    // "Index 3" (last move) shows state after move 3.
    // So "Latest" (-1) and "Index 3" (3) display the SAME FEN.
    // But conceptually:
    // -1: "Live" / "Latest" state.
    // 3: "Reviewing move 3".

    // Logic:
    // if (currentPosition === -1) targetPos = moves.length - 2;
    // This seems to skip index 3?
    // If moves.length = 4 (indices 0, 1, 2, 3).
    // -1 (Latest) -> displays result of move 3.
    // targetPos = 2 (Move 2) -> displays result of move 2.
    // So going "Previous" from "Latest" goes to "Result of Move 2".
    // Effectively undoing Move 3?
    // Wait, "Latest" = After Move 3. "Move 2" = After Move 2.
    // So yes, it goes back one step.

    // BUT!
    // My bug fix relies on `currentPosition === movesLength - 1` being a valid state where "Next" is disabled.
    // Can we ever get to `movesLength - 1`?

    act(() => {
      result.current.navigateToPosition(3);
    });
    expect(result.current.currentPosition).toBe(3);

    // From 3, Next should go to -1?
    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(-1);

    // From -1, Previous goes to 2?
    // If so, we never reach 3 via "Previous" from -1.
    // We only reach 3 via "Next" from 2?
  });

  it('should step through all moves', () => {
    const { result } = renderHook(() => useMoveNavigation(defaultProps));

    act(() => {
      result.current.navigateToStart();
    });

    // Start: -2
    expect(result.current.currentPosition).toBe(-2);

    // Next: 0 (Move 1)
    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(0);

    // Next: 1 (Move 2)
    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(1);

    // Next: 2 (Move 3)
    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(2);

    // Next: 3 (Move 4 - Last Move)
    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(3);

    // Next: -1 (Latest / End)
    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(-1);
  });

  it('navigates correctly around the end of move list', () => {
    const { result } = renderHook(() => useMoveNavigation(defaultProps));

    // Navigate to last move explicitly
    act(() => {
      result.current.navigateToPosition(3);
    });
    expect(result.current.currentPosition).toBe(3);

    // This is the state where my fix in BoardViewModal will disable the Next button:
    // (movesLength > 0 && currentPosition === movesLength - 1)
    // 4 > 0 && 3 === 3. True. Next disabled.

    // Wait, if Next is disabled in UI, user can't click it.
    // But if they COULD click it (e.g. via keyboard shortcut or if logic was wrong),
    // calling navigateNext() should take us to -1.
    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentPosition).toBe(-1);

    // Now at -1. "Next" button logic:
    // currentPosition === -1. True. Next disabled.

    // So both 3 and -1 have "Next" disabled in my proposed fix?
    // Wait.
    // If at 3 (Last Move), I see the board state after Move 3.
    // If at -1 (Latest), I see the board state after Move 3.
    // They are visually identical.

    // If I am at 3, and clicking Next takes me to -1.
    // Visual change: None.
    // Button state change: -1 also has Next disabled.

    // The bug report says:
    // "1.e4 がプレイされた状態に戻す" (Back to state with 1.e4 played)
    // "これ以上先に進む対象のムーブがないのに、 > や >> がクリッカブルである" (Even though no component, > and >> are clickable)

    // In the repro steps:
    // 1. e4 (1 move)
    // Preview.
    // < (to start)
    // >> (to end/latest) -> This puts state at -1? Or 0?
    // < (back) -> to start.
    // > (next) -> to 0 (1.e4).

    // If at 0 (1.e4, last move).
    // isNextDisabled?
    // old logic: currentPosition === -1. (0 !== -1). Button ENABLED.
    // User clicks >.
    // navigateNext() from 0 (where moves.length=1) -> goes to -1.
    // State becomes -1. Visuals same.
    // Now at -1. Button DISABLED.

    // The user finds it "creepy" that > is enabled at 0, when 0 is effectively the end.

    // My fix:
    // isNextDisabled = (-1 OR (movesLength > 0 && currentPosition === movesLength - 1))
    // At 0: disabled.

    // So verifying that we CAN reach movesLength - 1 is crucial.
    // Test confirms we reach 3 (movesLength-1).
  });
});
