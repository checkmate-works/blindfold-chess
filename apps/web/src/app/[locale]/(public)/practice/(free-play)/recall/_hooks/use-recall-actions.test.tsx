import { useState } from 'react';

import type { AlgebraicNotation } from '@blindfold-chess/types';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MoveLogEntry } from '../_lib';
import { computeRecallStats } from '../_lib';
import { useRecallActions } from './use-recall-actions';

const MOVES = ['e4', 'e5', 'Nf3', 'Nc6'] as AlgebraicNotation[];

/**
 * Drive useRecallActions with real state, the way useRecallGame wires it.
 * `isPlayerTurn` is derived from move-index parity exactly like the real
 * composition (white moves on even half-move indexes here — `startsAsBlack`
 * is false), so the auto-opponent effect cascades and stops where it would
 * in the app.
 */
function useHarness({
  originalMoves = MOVES,
  autoOpponent = false,
  playerColor = 'white',
  initialMoveIndex = 0,
}: {
  originalMoves?: AlgebraicNotation[];
  autoOpponent?: boolean;
  playerColor?: 'white' | 'black';
  initialMoveIndex?: number;
}) {
  const [userMoves, setUserMoves] = useState<AlgebraicNotation[]>(
    originalMoves.slice(0, initialMoveIndex)
  );
  const [currentMoveIndex, setCurrentMoveIndex] = useState(initialMoveIndex);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const movingSide = currentMoveIndex % 2 === 0 ? 'white' : 'black';
  const isPlayerTurn = !autoOpponent || movingSide === playerColor;

  const actions = useRecallActions({
    originalMoves,
    userMoves,
    currentMoveIndex,
    startsAsBlack: false,
    startMoveNumber: 1,
    isPlayerTurn,
    autoOpponent,
    isCompleted,
    setUserMoves,
    setCurrentMoveIndex,
    setMoveLog,
    setIsCompleted,
  });

  return { actions, moveLog, currentMoveIndex, isCompleted, userMoves };
}

describe('useRecallActions handleAnalyzeAll', () => {
  it('marks every remaining move autoFilled when the user enters both sides', () => {
    const { result } = renderHook(() => useHarness({ autoOpponent: false }));

    act(() => result.current.actions.handleAnalyzeAll());

    expect(result.current.moveLog.map((e) => e.status)).toEqual([
      'autoFilled',
      'autoFilled',
      'autoFilled',
      'autoFilled',
    ]);
    expect(result.current.currentMoveIndex).toBe(4);
    expect(result.current.isCompleted).toBe(true);
    // All four count against recall.
    expect(computeRecallStats(result.current.moveLog)).toMatchObject({ missed: 4, total: 4 });
  });

  it("keeps the opponent's share as `auto` (stats-excluded) in auto-opponent mode", () => {
    const { result } = renderHook(() => useHarness({ autoOpponent: true }));

    act(() => result.current.actions.handleAnalyzeAll());

    // Player is white: e4 / Nf3 are the player's (missed), e5 / Nc6 the
    // opponent's — exactly what the auto-opponent would have filled anyway.
    expect(result.current.moveLog.map((e) => e.status)).toEqual([
      'autoFilled',
      'auto',
      'autoFilled',
      'auto',
    ]);
    expect(computeRecallStats(result.current.moveLog)).toMatchObject({ missed: 2, total: 2 });
  });

  it('anchors the side split on whose turn it currently is', () => {
    // Black player mid-game: index 1 (black to move) IS the player's turn.
    const { result } = renderHook(() =>
      useHarness({ autoOpponent: true, playerColor: 'black', initialMoveIndex: 1 })
    );

    act(() => result.current.actions.handleAnalyzeAll());

    expect(result.current.moveLog.map((e) => e.status)).toEqual([
      'autoFilled',
      'auto',
      'autoFilled',
    ]);
    expect(result.current.userMoves).toEqual(MOVES);
  });
});

describe('useRecallActions single-move paths', () => {
  it('logs a correct submission and advances', () => {
    const { result } = renderHook(() => useHarness({}));

    act(() => result.current.actions.handleSubmitMove('e4' as AlgebraicNotation, () => {}));

    expect(result.current.moveLog.map((e) => e.status)).toEqual(['correct']);
    expect(result.current.currentMoveIndex).toBe(1);
  });

  it('logs an incorrect attempt without advancing', () => {
    const { result } = renderHook(() => useHarness({}));

    act(() => result.current.actions.handleSubmitMove('d4' as AlgebraicNotation, () => {}));

    expect(result.current.moveLog).toEqual([
      expect.objectContaining({ status: 'incorrect', move: 'e4', incorrectMove: 'd4' }),
    ]);
    expect(result.current.currentMoveIndex).toBe(0);
  });

  it('logs an explicit "I don\'t know" as skipped and advances', () => {
    const { result } = renderHook(() => useHarness({}));

    act(() => result.current.actions.handleDontKnow(() => {}));

    expect(result.current.moveLog.map((e) => e.status)).toEqual(['skipped']);
    expect(result.current.currentMoveIndex).toBe(1);
  });

  it('auto-fills the opponent reply after the player moves in auto-opponent mode', () => {
    const { result } = renderHook(() => useHarness({ autoOpponent: true }));

    act(() => result.current.actions.handleSubmitMove('e4' as AlgebraicNotation, () => {}));

    // The player's correct move flips the turn; the effect fills the
    // opponent's e5 as `auto` and stops at the player's next move.
    expect(result.current.moveLog.map((e) => e.status)).toEqual(['correct', 'auto']);
    expect(result.current.currentMoveIndex).toBe(2);
  });
});
